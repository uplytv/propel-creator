import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { logError } from "../_shared/eventsCors.ts";
import { moneyEventRow, logMoneyEventSafe } from "../_shared/stripeWebhookLogic.ts";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// How many tickets to fetch per DB round-trip.
const BATCH_SIZE = 25;
// Stop processing and hand off to a continuation run before the runtime kills us.
const TIME_BUDGET_MS = 40_000;

// Refund a payment intent (full when amountCents is null), tolerating repeats and
// clamping partial amounts to whatever is still refundable (legacy per-ticket
// amounts are amount_total/qty and can carry fractional-cent rounding).
async function refundOnPaymentIntent(
  stripe: Stripe,
  paymentIntent: string,
  amountCents: number | null,
  idempotencyKey: string
) {
  try {
    await stripe.refunds.create(
      {
        payment_intent: paymentIntent,
        ...(amountCents !== null ? { amount: amountCents } : {}),
      },
      // Stripe-side idempotency: a retry after a crash between the refund and
      // the DB update returns the SAME refund object instead of a second one.
      { idempotencyKey }
    );
  } catch (e: any) {
    if (e?.code === "charge_already_refunded") return; // fully refunded already — done
    if (e?.code === "amount_too_large" && amountCents !== null) {
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

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let callerId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");

    // Continuation runs invoke this function with the service role key.
    const isInternal = token === serviceKey;
    if (!isInternal) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData.user) throw new Error("Unauthorized");
      callerId = userData.user.id;
    }

    const { event_id } = await req.json();
    if (!event_id) throw new Error("event_id required");

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();
    if (!event) throw new Error("Event not found");
    if (!isInternal && event.creator_id !== callerId) throw new Error("Not your event");

    // Cancel the event FIRST (idempotent): stops new sales immediately and lets
    // re-invocations resume refunding stragglers.
    if (event.status !== "canceled") {
      await supabase.from("events").update({ status: "canceled" }).eq("id", event_id);
    }

    // Void open resale listings so tickets for a canceled event can't be sold.
    await supabase
      .from("ticket_listings")
      .update({ status: "canceled" })
      .eq("event_id", event_id)
      .eq("status", "active");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const deadline = Date.now() + TIME_BUDGET_MS;
    const orderCache = new Map<string, any>();
    const failedIds = new Set<string>();
    const failures: Array<{ ticket_id: string; error: string }> = [];
    let processed = 0;

    // Resolve WHO gets the money back and HOW MUCH, for the CURRENT holder.
    // - Resold ticket: its stripe_payment_intent_id is still the ORIGINAL buyer's
    //   (the reseller's) payment — refunding it would pay the wrong person. The
    //   current holder's payment lives on the resale order (finalize-ticket-order
    //   repoints tickets.order_id to the resale order); that PI covers exactly one
    //   ticket, so refund it in full (price + buyer fee).
    // - Primary ticket: one payment intent can cover MANY tickets (and cart payments
    //   can span events), so refund ONLY this ticket's per-ticket amount:
    //   purchase_price_cents (tier price at purchase) or legacy amount_paid.
    async function resolveRefundTarget(
      ticket: any
    ): Promise<{ pi: string | null; amountCents: number | null }> {
      let order: any = null;
      if (ticket.order_id) {
        if (orderCache.has(ticket.order_id)) {
          order = orderCache.get(ticket.order_id);
        } else {
          const { data } = await supabase
            .from("orders")
            .select("id, order_type, stripe_payment_intent_id, stripe_checkout_session_id")
            .eq("id", ticket.order_id)
            .maybeSingle();
          order = data ?? null;
          orderCache.set(ticket.order_id, order);
        }
      }

      if (order?.order_type === "resale_ticket") {
        let pi: string | null = order.stripe_payment_intent_id ?? null;
        if (!pi && order.stripe_checkout_session_id) {
          const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
          pi = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        }
        return { pi, amountCents: null }; // full refund of the single-ticket resale payment
      }

      const cents =
        ticket.purchase_price_cents ?? Math.round(Number(ticket.amount_paid ?? 0) * 100);
      const pi = ticket.stripe_payment_intent_id ?? order?.stripe_payment_intent_id ?? null;
      return { pi, amountCents: cents };
    }

    while (Date.now() < deadline) {
      // Fetch a batch of unprocessed tickets; over-fetch to skip past in-run failures.
      const { data: batch } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", event_id)
        .in("status", ["active", "listed_for_resale"])
        .order("created_at", { ascending: true })
        .limit(BATCH_SIZE + failedIds.size);
      const pending = (batch ?? []).filter((t) => !failedIds.has(t.id)).slice(0, BATCH_SIZE);
      if (pending.length === 0) break;

      for (const ticket of pending) {
        if (Date.now() >= deadline) break;
        try {
          // Atomic claim — a concurrent/continuation run can never double-process
          // a ticket: only one caller transitions it out of an unprocessed status.
          const { data: claimed } = await supabase
            .from("tickets")
            .update({ status: "canceled" })
            .eq("id", ticket.id)
            .in("status", ["active", "listed_for_resale"])
            .select("id")
            .maybeSingle();
          if (!claimed) continue; // someone else already handled it

          try {
            const { pi, amountCents } = await resolveRefundTarget(ticket);
            if (pi && (amountCents === null || amountCents > 0)) {
              await refundOnPaymentIntent(
                stripe,
                pi,
                amountCents,
                `cancel-event-refund-${ticket.id}`
              );
              // Audit trail (fire-and-forget; logMoneyEventSafe can never throw)
              await logMoneyEventSafe(
                () => supabase.rpc("log_money_event", moneyEventRow("cancel-event", "refund", {
                  paymentIntentId: pi, userId: ticket.owner_id ?? ticket.buyer_id,
                  creatorId: event.creator_id, amountCents, referenceId: ticket.id,
                  metadata: { event_id, full_refund: amountCents === null, reason: "event_canceled" },
                })),
                (m) => console.warn(`[CANCEL-EVENT] ${m}`),
              );
            }
          } catch (e) {
            // Refund failed — release the claim so a later run can retry this ticket.
            await supabase
              .from("tickets")
              .update({ status: ticket.status })
              .eq("id", ticket.id);
            throw e;
          }

          await supabase.from("notifications").insert({
            user_id: ticket.owner_id ?? ticket.buyer_id,
            type: "event_canceled",
            title: "Event Canceled",
            message: `"${event.title}" has been canceled. ${ticket.amount_paid > 0 ? "A full refund has been issued." : ""}`,
          });
          processed++;
        } catch (e: any) {
          // Record the failure and keep going — never abort the whole run.
          failedIds.add(ticket.id);
          failures.push({ ticket_id: ticket.id, error: e?.message ?? String(e) });
          await logError(supabase, "cancel-event", e, { event_id, ticket_id: ticket.id }, callerId);
        }
      }
    }

    // Anything left (beyond this run's failures) means we ran out of time budget —
    // chain a continuation run so large events finish without the client re-calling.
    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event_id)
      .in("status", ["active", "listed_for_resale"]);
    const remaining = count ?? 0;
    const hasMore = remaining - failedIds.size > 0;

    if (hasMore) {
      const continuation = fetch(`${supabaseUrl}/functions/v1/cancel-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ event_id }),
      }).catch(() => {});
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(continuation);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        remaining,
        has_more: hasMore,
        failed: failures,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    await logError(supabase, "cancel-event", error, null, callerId);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
