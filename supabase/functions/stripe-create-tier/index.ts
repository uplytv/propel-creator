import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withCors(async (req) => {
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
    const userId = userData.user.id;

    const { name, description, price_monthly, price_yearly, welcome_message } = await req.json();
    if (!name || !price_monthly) throw new Error("name and price_monthly required");

    // Optional annual price (null = annual not offered)
    const yearlyAmount = price_yearly != null && Number(price_yearly) > 0 ? Number(price_yearly) : null;
    // Optional welcome message, capped at 1000 chars (DB CHECK enforces too)
    const welcomeMsg =
      typeof welcome_message === "string" && welcome_message.trim().length > 0
        ? welcome_message.trim().slice(0, 1000)
        : null;

    // Get creator's Stripe account
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id")
      .eq("creator_id", userId)
      .single();
    if (!stripeAccount) throw new Error("Stripe account not connected");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const product = await stripe.products.create({
      name,
      description: description || undefined,
      metadata: { creator_id: userId },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price_monthly * 100),
      currency: "usd",
      recurring: { interval: "month" },
    });

    // Optional yearly price on the same product
    let yearlyPriceId: string | null = null;
    if (yearlyAmount) {
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(yearlyAmount * 100),
        currency: "usd",
        recurring: { interval: "year" },
      });
      yearlyPriceId = yearlyPrice.id;
    }

    const { data: tier, error: tierError } = await supabase
      .from("subscription_tiers")
      .insert({
        creator_id: userId,
        name,
        description: description || "",
        price_monthly,
        price_yearly: yearlyAmount,
        welcome_message: welcomeMsg,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        stripe_price_id_yearly: yearlyPriceId,
      })
      .select()
      .single();

    if (tierError) throw tierError;

    return new Response(JSON.stringify({ tier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
