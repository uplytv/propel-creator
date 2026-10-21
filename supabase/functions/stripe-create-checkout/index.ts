import { getCreatorPlatformFeeRate } from "../_shared/platformFees.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    const body = await req.json();
    const { tier_id, creator_id, creator_username, space_id, success_url, cancel_url, embedded } = body;

    logStep("Request received", { tier_id, creator_id, userId: user.id });

    if (!tier_id || !creator_id) throw new Error("tier_id and creator_id required");

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from("member_subscriptions")
      .select("id, status")
      .eq("member_id", user.id)
      .eq("creator_id", creator_id)
      .maybeSingle();

    if (existingSub?.status === "active") {
      return new Response(JSON.stringify({ already_subscribed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get tier details
    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("id", tier_id)
      .single();

    if (!tier) throw new Error("Tier not found");
    logStep("Tier found", { name: tier.name, price: tier.price_monthly, stripe_price_id: tier.stripe_price_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let stripePriceId = tier.stripe_price_id;

    // Check if creator has Stripe Connect
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("creator_id", creator_id)
      .maybeSingle();

    const hasConnect = stripeAccount?.stripe_account_id && stripeAccount?.charges_enabled;
    logStep("Creator Stripe status", { hasConnect, accountId: stripeAccount?.stripe_account_id });

    if (!stripePriceId) {
      logStep("No stripe_price_id, creating product and price on-the-fly");

      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description || undefined,
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(tier.price_monthly * 100),
        currency: "usd",
        recurring: { interval: "month" },
      });

      stripePriceId = price.id;

      await supabase
        .from("subscription_tiers")
        .update({ stripe_price_id: price.id, stripe_product_id: product.id })
        .eq("id", tier_id);

      logStep("Created Stripe product/price", { productId: product.id, priceId: price.id });
    }

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://uply.tv";
    const creatorPath = creator_username ? `/creator/${creator_username}` : `/community/${creator_id}`;

    // Build session config
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "subscription",
      success_url: success_url || `${origin}${creatorPath}/community?joined=true&creator_id=${creator_id}`,
      cancel_url: cancel_url || `${origin}${creatorPath}`,
      metadata: {
        purchase_type: "subscription",
        member_id: user.id,
        creator_id,
        tier_id,
        space_id: space_id || "",
      },
    };

    // Free trial support
    const trialDays = tier.trial_days || 0;
    if (trialDays > 0) {
      sessionConfig.subscription_data = {
        ...(sessionConfig.subscription_data || {}),
        trial_period_days: trialDays,
      };
      logStep("Adding free trial", { trialDays });
    }

    if (hasConnect) {
      sessionConfig.subscription_data = {
        ...(sessionConfig.subscription_data || {}),
        application_fee_percent: 100 * await getCreatorPlatformFeeRate(supabase, creator_id),
        transfer_data: { destination: stripeAccount!.stripe_account_id },
      };
      logStep("Using Stripe Connect flow", { destination: stripeAccount!.stripe_account_id });
    }

    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${origin}${creatorPath}/community?joined=true&creator_id=${creator_id}&session_id={CHECKOUT_SESSION_ID}`;
      delete sessionConfig.success_url;
      delete sessionConfig.cancel_url;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id });

    if (embedded) {
      return new Response(JSON.stringify({ client_secret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
