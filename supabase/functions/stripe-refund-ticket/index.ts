import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { moneyEventRow, logMoneyEventSafe } from "../_shared/stripeWebhookLogic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hours before event start that refunds close, per creator refund policy.
// "no_refunds" blocks entirely; everything else has a 24h floor.
function refundWindowHours(policy: string | null): number {
  switch (policy) {
    case "7_days":
      return 168;
    case "48_hours":
      return 48;
    default:
      return 24;
  }
}

// Refund `amountCents` off a payment intent, clamping to whatever is still
// refundable (legacy per-ticket amounts are amount_total/qty and can carry
// fractional-cent rounding, so a rounded-up amount may exceed the balance).
async function refundOnPaymentIntent(
  stripe: Stripe,
  paymentIntent: string,
  amountCents: number,
  idempotencyKey: string
) {
  try {
    await stripe.refunds.create(
      { payment_intent: paymentIntent, amount: amountCents },
      // Stripe-side idempotency: a retry after a partial failure returns the
      // same refund instead of creating a second one.
      { idempotencyKey }
    );
  } catch (e: any) {
    if (e?.code === "charge_already_refunded") return; // fully refunded already — done
    if (e?.code === "amount_too_large") {
      const pi: any = await stripe.paymentIntents.retrieve(paymentIntent, {
        expand: ["latest_charge"],
      });
      const charge: any = pi?.latest_charge;
      const remaining = (charge?.amount ?? 0) - (charge?.amount_refunded ?? 0);
      if (remaining <= 0) return; // nothing left to refund — done
      const clamped = Math.min(amountCents, remaining);
      await stripe.refunds.create(
        { payment_intent: paymentIntent, amount: clamped },
        { idempotencyKey: `${idempotencyKey}-clamp-${clamped}` }
      );
      return;
    }
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Unauthorized");

    const { ticket_id } = await req.json();
    if (!ticket_id) throw new Error("ticket_id required");

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (error || !ticket) throw new Error("Ticket not found");

    if (ticket.buyer_id !== userData.user.id) throw new Error("Not your ticket");
    // Legacy tickets have owner_id null; otherwise the requester must be the CURRENT holder
    // (a buyer who transferred/resold the ticket away can no longer refund it).
    if (ticket.owner_id && ticket.owner_id !== userData.user.id) throw new Error("Not your ticket");
    if (ticket.status !== "active") throw new Error("Ticket is not active");

    // ── Resale/transfer-acquired tickets can't be self-refunded ──
    // The current holder's money went to the reseller (wallet credit), not to this
    // payment intent — refunding the PI would pay the wrong person.
    if ((ticket.transfer_count ?? 0) > 0) {
      throw new Error(
        "This ticket was acquired via resale or transfer and can't be self-refunded. Please contact the event organizer."
      );
    }
    if (ticket.order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("order_type")
        .eq("id", ticket.order_id)
        .maybeSingle();
      if (order?.order_type === "resale_ticket") {
        throw new Error(
          "This ticket was acquired via resale and can't be self-refunded. Please contact the event organizer."
        );
      }
    }

    // ── Eligibility: creator policy + time window + event state ──
    const { data: event } = await supabase
      .from("events")
      .select("id, starts_at, status, refund_policy, tickets_sold")
      .eq("id", ticket.event_id)
      .single();
    if (!event) throw new Error("Event not found");

    if (event.status === "canceled") {
      // cancel-event refunds all holders automatically — don't double-process here.
      throw new Error("This event was canceled — your refund is issued automatically.");
    }
    if (event.refund_policy === "no_refunds") {
      throw new Error("This event does not allow refunds.");
    }
    const hoursUntilStart = (new Date(event.starts_at).getTime() - Date.now()) / 3_600_000;
    const windowHours = Math.max(24, refundWindowHours(event.refund_policy));
    if (hoursUntilStart < windowHours) {
      throw new Error(
        `Refunds close ${windowHours} hours before the event starts.`
      );
    }

    // Per-ticket amount actually paid: the tier price at purchase (purchase_price_cents)
    // or the legacy per-ticket amount (amount_paid, dollars). NEVER refund the whole
    // payment intent — one payment can cover multiple tickets.
    const refundCents =
      ticket.purchase_price_cents ?? Math.round(Number(ticket.amount_paid ?? 0) * 100);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Atomic claim: only one caller transitions active -> refunded (idempotency).
    const { data: claimed } = await supabase
      .from("tickets")
      .update({ status: "refunded" })
      .eq("id", ticket_id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("Ticket is not active");

    // Refund ONLY this ticket's amount if it was paid.
    if (ticket.stripe_payment_intent_id && refundCents > 0) {
      try {
        await refundOnPaymentIntent(
          stripe,
          ticket.stripe_payment_intent_id,
          refundCents,
          `refund-ticket-${ticket.id}`
        );
      } catch (e: any) {
        // Release the claim so the user can retry once the underlying issue is fixed.
        await supabase.from("tickets").update({ status: "active" }).eq("id", ticket_id);
        throw e;
      }
      // Audit trail (fire-and-forget; logMoneyEventSafe can never throw)
      await logMoneyEventSafe(
        () => supabase.rpc("log_money_event", moneyEventRow("stripe-refund-ticket", "refund", {
          paymentIntentId: ticket.stripe_payment_intent_id, userId: ticket.buyer_id,
          creatorId: ticket.creator_id, amountCents: refundCents, referenceId: ticket.id,
          metadata: { event_id: ticket.event_id },
        })),
        (m) => console.warn(`[STRIPE-REFUND-TICKET] ${m}`),
      );
    }

    // Decrement tickets_sold
    if (event) {
      await supabase
        .from("events")
        .update({
          tickets_sold: Math.max(0, event.tickets_sold - 1),
          is_sold_out: false,
        })
        .eq("id", ticket.event_id);
    }

    // Notify first waitlist person
    const { data: firstWaiter } = await supabase
      .from("event_waitlist")
      .select("*")
      .eq("event_id", ticket.event_id)
      .eq("notified", false)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstWaiter) {
      await supabase
        .from("event_waitlist")
        .update({ notified: true })
        .eq("id", firstWaiter.id);

      await supabase.from("notifications").insert({
        user_id: firstWaiter.user_id,
        type: "event_waitlist",
        title: "A spot just opened! 🎉",
        message: "A ticket is now available. Grab it before it's gone!",
        link: `/discover`,
      });
    }

    return new Response(JSON.stringify({ success: true, refunded_cents: refundCents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
