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

    const { product_id, creator_id, stripe_price_id, purchase_type } = await req.json();
    if (!stripe_price_id) throw new Error("stripe_price_id required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: userData.user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    // Build session config
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email!,
      line_items: [{ price: stripe_price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/products?purchased=true`,
      cancel_url: `${origin}/products`,
      metadata: {
        purchase_type: purchase_type || "product",
        buyer_id: userData.user.id,
        product_id: product_id || "",
        creator_id: creator_id || "",
      },
    };

    // If there's a creator (not platform credit purchase), add application fee
    if (creator_id) {
      const { data: stripeAccount } = await supabase
        .from("creator_stripe_accounts")
        .select("stripe_account_id")
        .eq("creator_id", creator_id)
        .single();
      
      if (stripeAccount) {
        sessionConfig.payment_intent_data = {
          application_fee_amount: undefined, // Will be calculated from line items
          transfer_data: { destination: stripeAccount.stripe_account_id },
        };
        // 5% application fee
        const price = await stripe.prices.retrieve(stripe_price_id);
        const feeAmount = Math.round((price.unit_amount || 0) * 0.05);
        sessionConfig.payment_intent_data.application_fee_amount = feeAmount;
      }
    }

    // For credit purchases, redirect to buy-credits
    if (purchase_type === "credits") {
      sessionConfig.success_url = `${origin}/buy-credits?purchased=true`;
      sessionConfig.cancel_url = `${origin}/buy-credits`;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

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
