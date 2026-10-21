import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";
import { moneyEventRow, logMoneyEventSafe } from "../_shared/stripeWebhookLogic.ts";
import { withCors } from "../_shared/security.ts";

// Finalizes a multi-item cart checkout (create-cart-checkout). The Stripe
// webhook deliberately does not handle purchase_type='cart' (multi-creator
// carts don't fit its single-product branches), so — like the tier ticket
// flow (finalize-ticket-order) — a dedicated verify-and-fulfill function is
// called from the success page. Idempotent + race-safe: verifies the Stripe
// session is paid, claims the cart_orders row pending->processing, then per
// item writes the SAME records the single-product webhook path writes:
// product_purchases, access_grants, sales/revenue increment, notifications,
// and a 95% wallet credit (transactions row + wallet balance) per creator.
serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(
    SUPABASE_URL,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

  let body: any = null;
  let userId: string | null = null;
  try {
    // Buyer auth — the function does its own auth (verify_jwt=false like siblings).
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData } = await anon.auth.getUser(token);
    const user = userData?.user;
    if (!user) return err("Not authenticated", 401);
    userId = user.id;

    body = await req.json().catch(() => ({}));
    const sessionId = body?.session_id;
    if (!sessionId || typeof sessionId !== "string") return err("session_id required");

    // Verify with Stripe before touching anything.
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata ?? {};
    if (meta.purchase_type !== "cart" || !meta.cart_order_id) {
      return err("Not a cart checkout session");
    }
    if ((meta.buyer_id ?? meta.user_id) !== user.id) {
      return err("Session does not belong to caller", 403);
    }

    const { data: order } = await supabase
      .from("cart_orders").select("*").eq("id", meta.cart_order_id).maybeSingle();
    if (!order) return err("Cart order not found", 404);
    if (order.buyer_id !== user.id) return err("Cart order does not belong to caller", 403);
    if (order.stripe_session_id && order.stripe_session_id !== session.id) {
      return err("Session mismatch for this order", 409);
    }

    const items: Array<{
      product_id: string; creator_id: string | null; name?: string;
      type?: string; quantity?: number; unit_price?: number;
    }> = Array.isArray(order.items) ? order.items : [];

    const summary = () => ({
      items: items.map((i) => ({ product_id: i.product_id, name: i.name ?? "Product", quantity: i.quantity ?? 1 })),
      total: Number(order.subtotal ?? 0),
    });

    // Already done? Idempotent success.
    if (order.status === "completed") {
      return json({ ok: true, already: true, ...summary() });
    }

    if (session.status !== "complete" && session.payment_status !== "paid") {
      return err("Payment not completed yet", 402);
    }

    // Atomic claim: only one caller transitions pending -> processing.
    const paymentIntent = (session.payment_intent as string) ?? null;
    const { data: claimed } = await supabase
      .from("cart_orders")
      .update({ status: "processing", stripe_payment_intent_id: paymentIntent })
      .eq("id", order.id).eq("status", "pending")
      .select("id").maybeSingle();
    if (!claimed) {
      // Someone else is finalizing (or just did).
      const { data: fresh } = await supabase
        .from("cart_orders").select("status").eq("id", order.id).maybeSingle();
      if (fresh?.status === "completed") return json({ ok: true, already: true, ...summary() });
      return json({ ok: true, processing: true });
    }

    try {
      for (const item of items) {
        const qty = item.quantity ?? 1;
        const lineAmount = Math.round((item.unit_price ?? 0) * qty * 100) / 100;
        const fee = Math.round(lineAmount * 0.05 * 100) / 100; // 5% platform fee, same as single-product path
        const creatorId = item.creator_id;

        // 1) Purchase record (same shape the webhook writes for purchase_type product)
        await supabase.from("product_purchases").upsert({
          product_id: item.product_id,
          buyer_id: order.buyer_id,
          creator_id: creatorId,
          stripe_payment_intent_id: paymentIntent,
          amount: lineAmount,
          status: "completed",
        }, { onConflict: "product_id,buyer_id", ignoreDuplicates: true });

        // 2) Access grant (duplicates tolerated — retries are safe)
        const resourceType = item.type === "course" ? "course" : "product";
        const { error: agErr } = await supabase.from("access_grants").insert({
          user_id: order.buyer_id,
          resource_type: resourceType,
          resource_id: item.product_id,
          access_level: "full",
          source: "cart",
          stripe_payment_intent_id: paymentIntent,
          stripe_customer_id: (session.customer as string) ?? null,
          metadata: { purchase_type: "cart", cart_order_id: order.id },
        });
        if (agErr && !agErr.message?.includes("duplicate") && !agErr.message?.includes("unique")) {
          console.error("access_grants cart insert error:", agErr);
        }

        // 3) Sales/revenue counters (same rpc + fallback as the webhook)
        try {
          const { error: rpcErr } = await supabase.rpc("increment_product_sales" as any, {
            p_id: item.product_id, p_amount: lineAmount,
          });
          if (rpcErr) throw rpcErr;
        } catch (_e) {
          const { data: prod } = await supabase
            .from("products").select("sales, revenue").eq("id", item.product_id).maybeSingle();
          if (prod) {
            await supabase.from("products").update({
              sales: (prod.sales || 0) + 1,
              revenue: (prod.revenue || 0) + lineAmount,
            }).eq("id", item.product_id);
          }
        }

        // 4) Creator wallet credit: 95% of the line. The cart session is a plain
        // platform charge (no transfer_data — Stripe allows only one destination
        // per session, carts can span creators), so earnings are ledgered in the
        // wallet exactly like the single-product path and paid out via payouts.
        if (creatorId && lineAmount > 0) {
          const { data: wallet } = await supabase
            .from("wallets").select("id, available_balance, lifetime_earned")
            .eq("user_id", creatorId).maybeSingle();
          let walletRow = wallet;
          if (!walletRow) {
            const { data: w } = await supabase
              .from("wallets").insert({ user_id: creatorId, available_balance: 0 })
              .select("id, available_balance, lifetime_earned").single();
            walletRow = w;
          }
          if (walletRow) {
            // Per-(payment_intent, wallet) guard so a retry after partial failure
            // never double-credits. (One cart payment intent can legitimately
            // credit several creators, so the guard is scoped to the wallet.)
            const { data: existingTx } = await supabase
              .from("transactions").select("id")
              .eq("stripe_payment_intent_id", paymentIntent)
              .eq("wallet_id", walletRow.id)
              .eq("status", "completed")
              .maybeSingle();
            if (!existingTx) {
              const net = lineAmount - fee;
              await supabase.from("transactions").insert({
                wallet_id: walletRow.id,
                amount: lineAmount,
                net_amount: net,
                platform_fee_amount: fee,
                type: "earn",
                status: "completed",
                stripe_payment_intent_id: paymentIntent,
                reference_id: order.id,
                description: `Cart sale: ${item.name ?? "Product"}`,
                completed_at: new Date().toISOString(),
              });
              await supabase.from("wallets").update({
                available_balance: Number(walletRow.available_balance || 0) + net,
                lifetime_earned: Number(walletRow.lifetime_earned || 0) + net,
              }).eq("id", walletRow.id);
              // Audit trail (fire-and-forget; logMoneyEventSafe can never throw)
              await logMoneyEventSafe(
                () => supabase.rpc("log_money_event", moneyEventRow("finalize-cart-order", "wallet_credit", {
                  paymentIntentId: paymentIntent, userId: order.buyer_id, creatorId,
                  amountCents: lineAmount * 100, feeCents: fee * 100, referenceId: order.id,
                  metadata: { product_id: item.product_id },
                })),
                (m) => console.warn(`[FINALIZE-CART-ORDER] ${m}`),
              );
            }
          }

          // 5) Notifications (best-effort, mirror single-product copy)
          const { data: buyerProfile } = await supabase
            .from("profiles").select("display_name, username").eq("user_id", order.buyer_id).maybeSingle();
          const buyerName = buyerProfile?.display_name || buyerProfile?.username || "Someone";
          await supabase.from("notifications").insert({
            user_id: creatorId,
            type: "sale",
            title: "New Sale! 🎉",
            message: `${buyerName} purchased "${item.name ?? "a product"}" for $${lineAmount.toFixed(2)}`,
            actor_id: order.buyer_id,
            reference_id: item.product_id,
            link: "/dashboard",
          });
        }
      }
    } catch (e) {
      // Roll the order back so a retry (or reconciliation) can finish it —
      // every per-item write above is idempotent, so re-running is safe.
      await supabase.from("cart_orders").update({ status: "pending" }).eq("id", order.id);
      throw e;
    }

    await supabase.from("cart_orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", order.id);

    // One purchase confirmation for the buyer + clear the purchased cart rows.
    await supabase.from("notifications").insert({
      user_id: order.buyer_id,
      type: "purchase",
      title: "Purchase Confirmed ✅",
      message: `Your order of ${items.length} item${items.length === 1 ? "" : "s"} ($${Number(order.subtotal ?? 0).toFixed(2)}) is confirmed.`,
      reference_id: order.id,
      link: "/products",
    });
    const purchasedIds = items.map((i) => i.product_id).filter(Boolean);
    if (purchasedIds.length > 0) {
      await supabase.from("cart_items")
        .delete().eq("user_id", order.buyer_id).in("product_id", purchasedIds);
    }

    return json({ ok: true, ...summary() });
  } catch (e) {
    await logError(supabase, "finalize-cart-order", e, body, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
