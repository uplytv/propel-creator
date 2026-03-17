import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PRODUCT-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    const { product_id, creator_id, purchase_type } = await req.json();
    if (!product_id) throw new Error("product_id required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (productError || !product) throw new Error("Product not found");
    logStep("Product found", { name: product.name, price: product.price, stripe_price_id: product.stripe_price_id });

    let stripePriceId = product.stripe_price_id;

    // Auto-provision Stripe product/price if missing
    if (!stripePriceId) {
      logStep("No stripe_price_id, creating product and price on-the-fly");

      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description || undefined,
        ...(product.image_url ? { images: [product.image_url] } : {}),
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100),
        currency: "usd",
      });

      stripePriceId = stripePrice.id;

      await supabase
        .from("products")
        .update({ stripe_price_id: stripePrice.id })
        .eq("id", product_id);

      logStep("Created Stripe product/price", { productId: stripeProduct.id, priceId: stripePrice.id });
    }

    const effectiveCreatorId = creator_id || product.user_id;

    const customers = await stripe.customers.list({ email: userData.user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    // Build session config
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email!,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/products?purchased=true`,
      cancel_url: `${origin}/products`,
      metadata: {
        purchase_type: purchase_type || "product",
        buyer_id: userData.user.id,
        product_id: product_id,
        creator_id: effectiveCreatorId,
      },
    };

    // If there's a creator with Stripe Connect, add application fee
    if (effectiveCreatorId) {
      const { data: stripeAccount } = await supabase
        .from("creator_stripe_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("creator_id", effectiveCreatorId)
        .maybeSingle();

      if (stripeAccount?.stripe_account_id && stripeAccount?.charges_enabled) {
        const price = await stripe.prices.retrieve(stripePriceId);
        const feeAmount = Math.round((price.unit_amount || 0) * 0.05);
        sessionConfig.payment_intent_data = {
          application_fee_amount: feeAmount,
          transfer_data: { destination: stripeAccount.stripe_account_id },
        };
        logStep("Using Stripe Connect", { destination: stripeAccount.stripe_account_id, fee: feeAmount });
      } else {
        logStep("Platform-managed flow (no Connect)");
      }
    }

    // For credit purchases, redirect to buy-credits
    if (purchase_type === "credits") {
      sessionConfig.success_url = `${origin}/buy-credits?purchased=true`;
      sessionConfig.cancel_url = `${origin}/buy-credits`;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id });

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
