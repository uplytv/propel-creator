import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const email = userData.user.email;

    const { live_product_id, variant_selected, buyer_message } = await req.json();
    if (!live_product_id) throw new Error("live_product_id required");

    // Get product
    const { data: product, error: pErr } = await supabase
      .from("live_products")
      .select("*")
      .eq("id", live_product_id)
      .single();
    if (pErr || !product) throw new Error("Product not found");
    if (product.is_sold_out) throw new Error("Product is sold out");
    if (product.quantity_remaining <= 0) throw new Error("No stock remaining");

    // Get creator stripe account
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id")
      .eq("creator_id", product.creator_id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const amount = Math.round(product.price * 100); // cents
    const platformFee = Math.round(amount * 0.05); // 5%

    const origin = req.headers.get("origin") || "https://uply.tv";

    // Create checkout session for one-time purchase
    const sessionParams: any = {
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: product.title,
            ...(product.image_url ? { images: [product.image_url] } : {}),
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: {
        purchase_type: "live_product",
        live_product_id,
        buyer_id: userId,
        creator_id: product.creator_id,
        stream_id: product.stream_id,
      },
      success_url: `${origin}/stream/${product.stream_id}?purchase=success`,
      cancel_url: `${origin}/stream/${product.stream_id}`,
    };

    // If creator has Stripe Connect, use application fee
    if (stripeAccount?.stripe_account_id) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: { destination: stripeAccount.stripe_account_id },
      };
    }

    // Set customer
    const customers = await stripe.customers.list({ email: email!, limit: 1 });
    if (customers.data.length > 0) {
      sessionParams.customer = customers.data[0].id;
    } else {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Optimistically insert pending purchase  
    await supabase.from("live_purchases").insert({
      live_product_id,
      buyer_id: userId,
      creator_id: product.creator_id,
      amount: product.price,
      platform_fee: parseFloat((product.price * 0.05).toFixed(2)),
      creator_earnings: parseFloat((product.price * 0.95).toFixed(2)),
      status: "pending",
      stripe_payment_intent_id: session.id,
    });

    // Decrement quantity
    const newQty = product.quantity_remaining - 1;
    await supabase.from("live_products").update({
      quantity_remaining: newQty,
      is_sold_out: newQty <= 0,
    }).eq("id", live_product_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("stripe-create-live-purchase error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
