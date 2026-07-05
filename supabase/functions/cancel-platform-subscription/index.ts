import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Cancellation retention flow for UPLY platform subscriptions.
// action "accept_offer": one-time 30 free days instead of canceling (trial_end push).
// action "cancel": record exit-survey feedback, then cancel_at_period_end.
// Never deletes/voids anything, never refunds, never touches webhooks.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Legacy fixed-price products (pre-2026 plans) — same map as check-platform-subscription.
const PLATFORM_PRODUCTS: Record<string, string> = {
  "prod_UAMcfWZHDj9N3P": "pro",
  "prod_UAMdsCQEOof66s": "scale",
};

// New platform plans are recognized via subscription metadata stamped at checkout.
const PLATFORM_PLAN_KEYS = new Set(["starter", "unlimited", "agency_pro"]);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Basil-era Stripe API moved current_period_end onto subscription items;
// read both locations so we work regardless of account API version.
const periodEnd = (sub: any): number | null =>
  sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return jsonResponse({ error: "STRIPE_SECRET_KEY not set" }, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "accept_offer" && action !== "cancel") {
      return jsonResponse({ error: "invalid_action" }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Same lookup approach as check-platform-subscription: customer by email,
    // list subscriptions, match metadata.platform_plan or legacy product map.
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      return jsonResponse({ error: "no_active_subscription" });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "all",
      limit: 20,
    });

    let platformSub: any = null;
    let plan: string | null = null;

    for (const sub of subscriptions.data) {
      if (sub.status !== "active" && sub.status !== "trialing") continue;

      const metaPlan = (sub.metadata?.platform_plan || "").toLowerCase();
      if (PLATFORM_PLAN_KEYS.has(metaPlan)) {
        platformSub = sub;
        plan = metaPlan;
        break;
      }

      const productId = sub.items.data[0]?.price?.product as string;
      if (PLATFORM_PRODUCTS[productId]) {
        platformSub = sub;
        plan = PLATFORM_PRODUCTS[productId];
        break;
      }
    }

    if (!platformSub) {
      return jsonResponse({ error: "no_active_subscription" });
    }

    if (action === "accept_offer") {
      // One-time retention offer: 30 free days instead of canceling.
      if (platformSub.metadata?.retention_offer_used === "true") {
        return jsonResponse({ error: "offer_already_used" });
      }

      const freeUntilUnix = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      await stripe.subscriptions.update(platformSub.id, {
        trial_end: freeUntilUnix,
        proration_behavior: "none",
        metadata: { ...platformSub.metadata, retention_offer_used: "true" },
      });

      return jsonResponse({
        success: true,
        free_until: new Date(freeUntilUnix * 1000).toISOString(),
      });
    }

    // action === "cancel": record exit-survey feedback, then cancel at period end.
    const rating = Number(body?.rating);
    const feedbackRow = {
      user_id: user.id,
      plan,
      reason: body?.reason ? String(body.reason).slice(0, 2000) : null,
      would_return: body?.would_return ? String(body.would_return).slice(0, 50) : null,
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    };
    const { error: insertError } = await supabase
      .from("cancellation_feedback")
      .insert(feedbackRow);
    if (insertError) {
      // Feedback must never block the cancellation itself.
      console.error("[CANCEL-PLATFORM-SUB] feedback insert failed:", insertError.message);
    }

    const updated = await stripe.subscriptions.update(platformSub.id, {
      cancel_at_period_end: true,
    });

    const endsAtUnix = periodEnd(updated) ?? periodEnd(platformSub);
    return jsonResponse({
      success: true,
      ends_at: endsAtUnix ? new Date(endsAtUnix * 1000).toISOString() : null,
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
