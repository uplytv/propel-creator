import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { tier_id, creator_id, creator_username } = await req.json();
    if (!tier_id || !creator_id) throw new Error("tier_id and creator_id required");

    // Get tier details
    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("id", tier_id)
      .single();
    if (!tier || !tier.stripe_price_id) throw new Error("Tier not found or not configured");

    // Get creator's Stripe account
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id")
      .eq("creator_id", creator_id)
      .single();
    if (!stripeAccount) throw new Error("Creator has not connected Stripe");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://uply.tv";
    const creatorPath = creator_username ? `/creator/${creator_username}` : `/space/${creator_id}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        application_fee_percent: 5,
        transfer_data: { destination: stripeAccount.stripe_account_id },
      },
      success_url: `${origin}${creatorPath}?joined=true`,
      cancel_url: `${origin}${creatorPath}`,
      metadata: {
        member_id: user.id,
        creator_id,
        tier_id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
