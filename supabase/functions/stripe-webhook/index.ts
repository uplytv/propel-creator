import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing Stripe configuration" }), { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400, headers: corsHeaders });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: err.message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const { member_id, creator_id, tier_id } = metadata;

        if (member_id && creator_id) {
          // Insert member subscription
          await supabase.from("member_subscriptions").upsert({
            member_id,
            creator_id,
            tier_id: tier_id || null,
            stripe_subscription_id: session.subscription as string,
            stripe_customer_id: session.customer as string,
            status: "active",
            current_period_start: new Date().toISOString(),
          }, { onConflict: "member_id,creator_id" });

          // Add to community members
          await supabase.from("community_members").upsert({
            user_id: member_id,
            creator_id,
          }, { onConflict: "user_id,creator_id" });

          // Record transaction
          const amount = (session.amount_total || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          await supabase.from("transactions").insert({
            amount,
            net_amount: amount - fee,
            platform_fee_amount: fee,
            type: "subscription",
            status: "completed",
            stripe_payment_intent_id: session.payment_intent as string,
            description: `Subscription payment from member`,
            completed_at: new Date().toISOString(),
          });

          logStep("Checkout completed", { member_id, creator_id });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("member_subscriptions")
          .update({
            status: sub.status === "active" ? "active" : sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        logStep("Subscription updated", { id: sub.id, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("member_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        logStep("Subscription canceled", { id: sub.id });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_cycle") {
          const amount = (invoice.amount_paid || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          await supabase.from("transactions").insert({
            amount,
            net_amount: amount - fee,
            platform_fee_amount: fee,
            type: "subscription_renewal",
            status: "completed",
            stripe_payment_intent_id: invoice.payment_intent as string,
            description: "Subscription renewal",
            completed_at: new Date().toISOString(),
          });
          logStep("Invoice paid", { id: invoice.id, amount });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          await supabase
            .from("member_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
          logStep("Payment failed, marked past_due", { subId });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("creator_stripe_accounts")
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          })
          .eq("stripe_account_id", account.id);
        logStep("Account updated", { id: account.id, charges: account.charges_enabled });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("Error processing event", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
