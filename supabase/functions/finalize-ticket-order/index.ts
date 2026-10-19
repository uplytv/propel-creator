import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";

// Finalizes a tier-based ticket order (order_type='primary_ticket'). The Stripe
// webhook only handles the legacy 'event_ticket' path, so the tier flow needs
// this. Idempotent + race-safe: claims the order pending->processing, verifies
// the Stripe session is paid, creates one ticket per quantity (QR auto-gen),
// marks completed, and emails each ticket. Safe to call from the success page
// AND a reconciliation cron — only a genuinely paid order ever produces tickets.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

  let body: any = null;
  try {
    body = await req.json();
    const { order_id } = body ?? {};
    if (!order_id) return err("order_id required");

    const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (!order) return err("Order not found", 404);
    if (order.order_type !== "primary_ticket" && order.order_type !== "resale_ticket") {
      return err("Not a ticket order");
    }

    // Already done? Return existing tickets.
    if (order.status === "completed") {
      const { data: existing } = await supabase
        .from("tickets").select("id, qr_code_token").eq("order_id", order_id);
      return json({ ok: true, already: true, tickets: existing ?? [] });
    }

    // Verify payment with Stripe before doing anything.
    if (!order.stripe_checkout_session_id) return err("No checkout session on order", 400);
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if (session.payment_status !== "paid") {
      return err("Payment not completed yet", 402);
    }

    // Atomic claim: only one caller transitions pending -> processing.
    const { data: claimed } = await supabase
      .from("orders").update({ status: "processing" })
      .eq("id", order_id).eq("status", "pending").select().maybeSingle();
    if (!claimed) {
      // Someone else is finalizing (or just did) — return whatever exists.
      const { data: existing } = await supabase
        .from("tickets").select("id, qr_code_token").eq("order_id", order_id);
      return json({ ok: true, tickets: existing ?? [] });
    }

    // ── Resale: transfer the existing ticket to the buyer + pay the seller ──
    if (order.order_type === "resale_ticket") {
      const li = (Array.isArray(order.line_items) ? order.line_items[0] : null) as any;
      const ticketId = li?.ticket_id;
      const listingId = li?.listing_id;
      if (!ticketId) {
        await supabase.from("orders").update({ status: "pending" }).eq("id", order.id);
        return err("Resale order missing ticket");
      }

      // Rotate the QR so the seller's old code (and any screenshot) is void.
      const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: prev } = await supabase
        .from("tickets").select("owner_id, original_purchaser_id, transfer_count").eq("id", ticketId).maybeSingle();

      await supabase.from("tickets").update({
        owner_id: order.buyer_id,
        buyer_id: order.buyer_id,
        original_purchaser_id: prev?.original_purchaser_id ?? prev?.owner_id ?? null,
        status: "active",
        qr_code_secret: newSecret,
        transfer_count: (prev?.transfer_count ?? 0) + 1,
        current_price_cents: order.subtotal_cents ?? null,
        order_id: order.id,
      }).eq("id", ticketId);

      if (listingId) {
        await supabase.from("ticket_listings")
          .update({ status: "sold", sold_at: new Date().toISOString() }).eq("id", listingId);
      }

      // Credit the seller's wallet with the sale price (platform keeps the buyer fee).
      const sellerId = (order.metadata as any)?.seller_id;
      const proceedsCents = order.subtotal_cents ?? 0;
      if (!Number.isSafeInteger(proceedsCents) || proceedsCents < 0) throw new Error("Invalid proceeds cents");
      if (sellerId && proceedsCents > 0) {
        const { error: creditError } = await supabase.rpc("increment_wallet_balance", {
          p_order_id: order.id, p_amount_cents: proceedsCents,
        });
        if (creditError) throw creditError;
        await supabase.from("notifications").insert({
          user_id: sellerId, type: "resale_sold", title: "💸 Your ticket sold",
          message: `Your resale ticket sold for $${Math.floor(proceedsCents / 100)}.${String(proceedsCents % 100).padStart(2, "0")} — added to your wallet.`,
          reference_id: order.event_id,
        });
      }

      await supabase.from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", order.id);

      try { await supabase.functions.invoke("send-ticket-email", { body: { ticket_id: ticketId } }); } catch (_e) { /* non-fatal */ }
      const { data: tkRow } = await supabase
        .from("tickets").select("qr_code_token").eq("id", ticketId).maybeSingle();
      await supabase.from("notifications").insert({
        user_id: order.buyer_id, type: "ticket", title: "🎟️ Resale ticket confirmed",
        message: "Your ticket is ready — any old QR codes for it are now void.",
        link: tkRow?.qr_code_token ? `/tickets/${tkRow.qr_code_token}` : "/tickets",
        reference_id: order.event_id,
      });

      return json({ ok: true, resale: true, tickets: [{ id: ticketId, qr_code_token: tkRow?.qr_code_token }] });
    }

    const { data: event } = await supabase
      .from("events").select("id, creator_id, title").eq("id", order.event_id).maybeSingle();

    const lineItems: Array<{ tier_id?: string; quantity?: number; unit_price_cents?: number }> =
      Array.isArray(order.line_items) ? order.line_items : [];
    const totalQty = lineItems.reduce((n, li) => n + (li.quantity ?? 0), 0) || 1;
    const feesCents = order.fees_cents ?? 0;
    if (!Number.isSafeInteger(feesCents) || feesCents < 0) throw new Error("Invalid fee cents");
    const perTicketFeeCents = Math.floor(feesCents / totalQty);
    const remainderFeeCents = feesCents % totalQty;
    const paymentIntent = (session.payment_intent as string) ?? null;

    const created: Array<{ id: string; qr_code_token: string }> = [];
    try {
      for (const li of lineItems) {
        const qty = li.quantity ?? 1;
        const unitCents = li.unit_price_cents ?? 0;
        if (!Number.isSafeInteger(unitCents) || unitCents < 0) throw new Error("Invalid ticket price cents");
        if (li.tier_id) {
          await supabase.rpc("confirm_ticket_inventory", { p_tier_id: li.tier_id, p_quantity: qty });
        }
        for (let i = 0; i < qty; i++) {
          const ticketFeeCents = perTicketFeeCents + (created.length < remainderFeeCents ? 1 : 0);
          const { data: tk, error: tErr } = await supabase
            .from("tickets")
            .insert({
              event_id: order.event_id,
              buyer_id: order.buyer_id,
              owner_id: order.buyer_id,
              creator_id: event?.creator_id ?? order.buyer_id,
              tier_id: li.tier_id ?? null,
              order_id: order.id,
              stripe_payment_intent_id: paymentIntent,
              amount_paid: unitCents / 100,
              platform_fee: ticketFeeCents / 100,
              creator_earnings: (unitCents - ticketFeeCents) / 100,
              purchase_price_cents: unitCents,
              current_price_cents: unitCents,
              status: "active",
            })
            .select("id, qr_code_token")
            .single();
          if (tErr) throw tErr;
          if (tk) created.push(tk);
        }
      }
    } catch (e) {
      // Roll the order back so a retry (or the cron) can finish it.
      await supabase.from("orders").update({ status: "pending" }).eq("id", order.id);
      throw e;
    }

    await supabase
      .from("orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", order.id);

    // Email each ticket (best-effort) + one in-app notification.
    for (const tk of created) {
      try {
        await supabase.functions.invoke("send-ticket-email", { body: { ticket_id: tk.id } });
      } catch (_e) { /* non-fatal */ }
    }
    if (created[0]) {
      await supabase.from("notifications").insert({
        user_id: order.buyer_id,
        type: "ticket",
        title: "🎟️ Your ticket is ready",
        message: `Your ticket${created.length > 1 ? "s" : ""} for ${event?.title ?? "the event"} ${created.length > 1 ? "are" : "is"} confirmed.`,
        link: `/tickets/${created[0].qr_code_token}`,
        reference_id: order.event_id,
      });
    }

    return json({ ok: true, tickets: created });
  } catch (e) {
    await logError(supabase, "finalize-ticket-order", e, body, null);
    return err((e as Error).message ?? "Failed", 500);
  }
});
