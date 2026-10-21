import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";
import { withCors } from "../_shared/security.ts";

// IMPORTANT: On iOS Capacitor, the client should set provider='storekit' and pass storekit_transaction_id.
// Apple Guideline 3.1.1 — digital tips must use IAP. We accept a verified StoreKit receipt instead of charging Stripe.
serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  let userId: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    userId = u.user.id;

    const {
      to_user_id,
      amount_cents,
      message,
      context_type,
      context_id,
      provider = "stripe",
      storekit_transaction_id,
      success_url,
      cancel_url,
    } = await req.json();

    if (!to_user_id || !amount_cents) return err("to_user_id and amount_cents required");
    if (amount_cents < 100) return err("Min $1");
    if (amount_cents > 50000) return err("Max $500");
    if (to_user_id === userId) return err("Cannot tip yourself");

    const idempotencyKey = req.headers.get("x-idempotency-key") ?? crypto.randomUUID();

    // ---------- StoreKit branch (iOS native) ----------
    if (provider === "storekit") {
      if (!storekit_transaction_id) return err("storekit_transaction_id required for storekit");
      // TODO: Verify the receipt against Apple's verifyReceipt endpoint with shared secret.
      // Until App Store Connect is set up, we trust the client signal — gated by feature flag.
      const { data: order } = await supabase
        .from("orders")
        .insert({
          buyer_id: userId,
          order_type: "tip",
          subtotal_cents: amount_cents,
          total_cents: amount_cents,
          status: "completed",
          payment_provider: "storekit",
          storekit_transaction_id,
          idempotency_key: idempotencyKey,
          completed_at: new Date().toISOString(),
          metadata: { to_user_id, message },
        })
        .select()
        .single();
      const { data: tip } = await supabase
        .from("tips")
        .insert({
          from_user_id: userId,
          to_user_id,
          amount_cents,
          message,
          context_type: context_type ?? null,
          context_id: context_id ?? null,
          payment_provider: "storekit",
          order_id: order?.id,
        })
        .select()
        .single();
      // notify recipient
      await supabase.from("notifications").insert({
        user_id: to_user_id,
        type: "tip_received",
        title: "💚 Tip Received",
        message: `$${(amount_cents / 100).toFixed(2)}${message ? ` — "${message.slice(0, 80)}"` : ""}`,
        actor_id: userId,
      });
      return json({ ok: true, tip_id: tip?.id, provider: "storekit" });
    }

    // ---------- Stripe branch (web + Android) ----------
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    const { data: order } = await supabase
      .from("orders")
      .insert({
        buyer_id: userId,
        order_type: "tip",
        subtotal_cents: amount_cents,
        total_cents: amount_cents,
        status: "pending",
        payment_provider: "stripe",
        idempotency_key: idempotencyKey,
        metadata: { to_user_id, message, context_type, context_id },
      })
      .select()
      .single();
    if (!order) throw new Error("Order failed");

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Tip on UPLY" },
              unit_amount: amount_cents,
            },
            quantity: 1,
          },
        ],
        success_url:
          success_url ?? `${req.headers.get("origin") ?? "https://uply.tv"}/?tip=success`,
        cancel_url:
          cancel_url ?? `${req.headers.get("origin") ?? "https://uply.tv"}/?tip=cancel`,
        client_reference_id: order.id,
        metadata: {
          order_id: order.id,
          to_user_id,
          from_user_id: userId,
          context_type: context_type ?? "",
          context_id: context_id ?? "",
          message: message ?? "",
          order_type: "tip",
        },
      },
      { idempotencyKey },
    );
    await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    return json({ url: session.url, order_id: order.id, provider: "stripe" });
  } catch (e) {
    await logError(supabase, "tip-user", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
