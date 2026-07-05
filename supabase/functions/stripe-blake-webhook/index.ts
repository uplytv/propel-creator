// Stripe webhook for Blake Blueprint subscriptions.
// Configure a dedicated Stripe endpoint pointing to /functions/v1/stripe-blake-webhook
// and paste its signing secret into STRIPE_BLAKE_WEBHOOK_SECRET.
// Listen for: checkout.session.completed, customer.subscription.created/updated/deleted,
// invoice.payment_succeeded, invoice.payment_failed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRICE_ID = "price_1ToRuS4C2GQMnrEDlfaTPxvo";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const log = (step: string, data?: unknown) =>
  console.log(`[BLAKE-WEBHOOK] ${step}${data ? ` ${JSON.stringify(data)}` : ""}`);

async function upsertFromSubscription(sub: Stripe.Subscription) {
  // Only track Blake Blueprint subscriptions.
  const relevant = sub.items.data.some((i) => i.price.id === PRICE_ID);
  if (!relevant) {
    log("skip non-blake subscription", { id: sub.id });
    return;
  }

  const customerId = sub.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const email = (customer as Stripe.Customer).email?.toLowerCase();
  if (!email) {
    log("missing customer email", { customerId });
    return;
  }

  let userId: string | null = (sub.metadata?.user_id as string) || null;
  if (!userId) {
    const { data: userRow } = await supabase
      .from("blake_subscribers")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    userId = userRow?.user_id ?? null;
  }

  const status =
    sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;

  const row = {
    user_id: userId,
    email,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("blake_subscribers")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) {
    log("upsert error, attempting email-conflict recovery", error);
    // Likely a stale canceled row with the same email but a different
    // stripe_subscription_id blocking the unique(lower(email)) index.
    // Delete the stale row(s) and retry as an insert.
    const { error: delErr } = await supabase
      .from("blake_subscribers")
      .delete()
      .eq("email", email)
      .neq("stripe_subscription_id", sub.id);
    if (delErr) {
      log("cleanup delete failed", delErr);
      return;
    }
    const { error: retryErr } = await supabase
      .from("blake_subscribers")
      .upsert(row, { onConflict: "stripe_subscription_id" });
    if (retryErr) log("retry upsert error", retryErr);
    else log("upserted after cleanup", { email, status });
  } else {
    log("upserted", { email, status });
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const signature = req.headers.get("stripe-signature");
  const webhookSecret =
    Deno.env.get("STRIPE_BLAKE_WEBHOOK_SECRET") ||
    Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    return new Response("Missing signature / secret", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (e) {
    log("signature verification failed", { err: (e as Error).message });
    return new Response(`Webhook Error: ${(e as Error).message}`, { status: 400 });
  }

  log("event", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await upsertFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
          );
          await upsertFromSubscription(sub);
        }
        break;
      }
      default:
        log("unhandled event", { type: event.type });
    }
  } catch (e) {
    log("handler error", { err: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
