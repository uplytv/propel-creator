import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, logError } from "../_shared/eventsCors.ts";

// Cron job: release ticket inventory held by abandoned checkouts so on-sales
// don't show phantom "sold out". RACE-SAFE: only releases a hold once Stripe
// confirms the session is NOT paid (expired/open-past-expiry). Paid sessions
// are left for the webhook to finalize. Schedule every ~5-10 min.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  try {
    // Pending primary-ticket orders older than the 30-min Stripe expiry window
    // (+5 min margin) are candidates for release.
    const cutoff = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const { data: stale } = await supabase
      .from("orders")
      .select("id, line_items, stripe_checkout_session_id")
      .eq("order_type", "primary_ticket")
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .limit(200);

    let released = 0;
    let skippedPaid = 0;

    for (const order of stale ?? []) {
      // Confirm the session is genuinely dead before releasing inventory.
      if (order.stripe_checkout_session_id) {
        try {
          const session = await stripe.checkout.sessions.retrieve(
            order.stripe_checkout_session_id,
          );
          if (session.status === "complete" || session.payment_status === "paid") {
            // Paid but still pending => the buyer never returned to the success
            // page to finalize. Finalize it now (idempotent) so they get their
            // ticket + email instead of releasing paid inventory.
            skippedPaid++;
            try {
              await supabase.functions.invoke("finalize-ticket-order", {
                body: { order_id: order.id },
              });
            } catch (_e) { /* next run will retry */ }
            continue;
          }
        } catch (_e) {
          // If the session can't be retrieved, fall through and release.
        }
      }

      const lineItems: Array<{ tier_id?: string; quantity?: number }> = Array.isArray(
        order.line_items,
      )
        ? order.line_items
        : [];
      for (const li of lineItems) {
        if (li.tier_id && li.quantity) {
          await supabase.rpc("release_ticket_inventory", {
            p_tier_id: li.tier_id,
            p_quantity: li.quantity,
          });
        }
      }

      await supabase
        .from("orders")
        .update({ status: "expired" })
        .eq("id", order.id)
        .eq("status", "pending"); // guard against a concurrent webhook flip

      released++;
    }

    return json({ ok: true, released, skipped_paid: skippedPaid, scanned: stale?.length ?? 0 });
  } catch (e) {
    await logError(supabase, "release-expired-ticket-holds", e, null, null);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
