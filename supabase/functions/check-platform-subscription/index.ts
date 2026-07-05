import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Legacy fixed-price products (pre-2026 plans).
const PLATFORM_PRODUCTS: Record<string, string> = {
  "prod_UAMcfWZHDj9N3P": "pro",
  "prod_UAMdsCQEOof66s": "scale",
};

// New platform plans are created with inline price_data (ad-hoc product IDs),
// so they're recognized via subscription metadata set by create-platform-checkout.
const PLATFORM_PLAN_KEYS = new Set(["starter", "unlimited", "agency_pro"]);

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
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    // status "all" so 14-day free trials (status: "trialing") count as subscribed;
    // filtered to active/trialing below.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    let plan = "free";
    let subscriptionEnd: string | null = null;
    let isTrial = false;

    for (const sub of subscriptions.data) {
      if (sub.status !== "active" && sub.status !== "trialing") continue;

      // New plans: identified by metadata stamped on the subscription at checkout.
      const metaPlan = (sub.metadata?.platform_plan || "").toLowerCase();
      if (PLATFORM_PLAN_KEYS.has(metaPlan)) {
        plan = metaPlan;
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        isTrial = sub.status === "trialing";
        break;
      }

      // Legacy plans: identified by fixed product ID.
      const productId = sub.items.data[0]?.price?.product as string;
      if (PLATFORM_PRODUCTS[productId]) {
        plan = PLATFORM_PRODUCTS[productId];
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        isTrial = sub.status === "trialing";
        break;
      }
    }

    return new Response(JSON.stringify({
      subscribed: plan !== "free",
      plan,
      subscription_end: subscriptionEnd,
      is_trial: isTrial,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
