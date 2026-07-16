import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createSessionWithTax } from "../_shared/stripeTax.ts";

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

    const { product_id, creator_id, purchase_type, success_url, cancel_url, embedded, coupon_code } = await req.json();
    if (!product_id) throw new Error("product_id required");

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("product_purchases")
      .select("id")
      .eq("product_id", product_id)
      .eq("buyer_id", userData.user.id)
      .maybeSingle();

    if (existingPurchase) {
      return new Response(JSON.stringify({ already_purchased: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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
    const effectiveCreatorId = creator_id || product.user_id;

    // UPLY-level coupon (NOT a Stripe promotion code — those would be
    // redeemable platform-wide across other creators' checkouts). The client
    // pre-validates via the validate_coupon RPC for UX; we ALWAYS re-validate
    // here server-side and apply percent_off to the unit_amount before the
    // session is created. The 5% application fee below is computed from the
    // discounted amount, so the 95/5 split applies to what the buyer pays.
    let appliedCoupon: { id: string; percent_off: number; code: string } | null = null;
    let discountedUnitAmount: number | null = null;
    if (coupon_code && typeof coupon_code === "string" && coupon_code.trim()) {
      const normalizedCode = coupon_code.trim().toUpperCase();
      const { data: couponRows, error: couponErr } = await supabase.rpc("validate_coupon", {
        p_creator_id: effectiveCreatorId,
        p_code: normalizedCode,
        p_product_id: product_id,
      });
      const match = Array.isArray(couponRows) ? couponRows[0] : couponRows;
      if (couponErr || !match) {
        logStep("Coupon rejected", { code: normalizedCode, error: couponErr?.message });
        throw new Error("That code isn't valid for this product");
      }
      const baseAmount = Math.round(Number(product.price) * 100);
      const discounted = Math.round((baseAmount * (100 - match.percent_off)) / 100);
      // Stripe payment-mode sessions require a charge of at least $0.50.
      if (discounted < 50) {
        throw new Error("This code brings the price below the $0.50 card minimum — the creator should use a free product instead");
      }
      appliedCoupon = { id: match.coupon_id, percent_off: match.percent_off, code: normalizedCode };
      discountedUnitAmount = discounted;
      logStep("Coupon applied", { code: normalizedCode, percent_off: match.percent_off, discounted });
    }

    // Auto-provision Stripe product/price if missing
    if (!stripePriceId) {
      logStep("No stripe_price_id, creating product and price on-the-fly");

      // Check if creator has Connect
      const { data: stripeAccount } = await supabase
        .from("creator_stripe_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("creator_id", effectiveCreatorId)
        .maybeSingle();

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

    const customers = await stripe.customers.list({ email: userData.user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    // Build session config. With a coupon, the discount is applied to the
    // unit_amount via price_data BEFORE session creation (inline price for
    // this session only; the stored stripe_price_id is untouched).
    const lineItems = discountedUnitAmount !== null
      ? [{
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              ...(product.image_url ? { images: [product.image_url] } : {}),
            },
            unit_amount: discountedUnitAmount,
          },
          quantity: 1,
        }]
      : [{ price: stripePriceId, quantity: 1 }];

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email!,
      line_items: lineItems,
      mode: "payment",
      success_url: success_url || `${origin}/products?purchased=true&product_id=${product_id}`,
      cancel_url: cancel_url || `${origin}/products`,
      metadata: {
        purchase_type: purchase_type || "course",
        buyer_id: userData.user.id,
        product_id: product_id,
        creator_id: effectiveCreatorId,
        ...(appliedCoupon
          ? {
              coupon: appliedCoupon.code,
              coupon_id: appliedCoupon.id,
              coupon_percent_off: String(appliedCoupon.percent_off),
            }
          : {}),
      },
    };

    // If there's a creator with Stripe Connect, add application fee
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("creator_id", effectiveCreatorId)
      .maybeSingle();

    if (stripeAccount?.stripe_account_id && stripeAccount?.charges_enabled) {
      // Fee base is what the buyer actually pays: the coupon-discounted
      // amount when a code is applied, the stored price otherwise. The 5%
      // platform-fee rate itself is unchanged.
      let feeBaseAmount: number;
      if (discountedUnitAmount !== null) {
        feeBaseAmount = discountedUnitAmount;
      } else {
        const price = await stripe.prices.retrieve(stripePriceId);
        feeBaseAmount = price.unit_amount || 0;
      }
      const feeAmount = Math.round(feeBaseAmount * 0.05);
      sessionConfig.payment_intent_data = {
        application_fee_amount: feeAmount,
        transfer_data: { destination: stripeAccount.stripe_account_id },
      };
      logStep("Using Stripe Connect", { destination: stripeAccount.stripe_account_id, fee: feeAmount });
    }

    // For credit purchases, redirect to buy-credits
    if (purchase_type === "credits") {
      sessionConfig.success_url = `${origin}/buy-credits?purchased=true`;
      sessionConfig.cancel_url = `${origin}/buy-credits`;
    }

    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${origin}/products?purchased=true&product_id=${product_id}&session_id={CHECKOUT_SESSION_ID}`;
      delete sessionConfig.success_url;
      delete sessionConfig.cancel_url;
    }

    // Redemption is counted HERE, at session creation, via an atomic guarded
    // UPDATE (consume_coupon fails once the cap is hit, so concurrent
    // checkouts can't exceed max_redemptions). The paid-side hooks can't do
    // this reliably: the Stripe webhook is frozen, and verify-product-purchase
    // only runs if the buyer returns to a page that invokes it — the embedded
    // overlay flow never does. Trade-off: an abandoned session consumes a
    // redemption (over-count), which errs on the side of fewer discounts.
    if (appliedCoupon) {
      const { data: consumed, error: consumeErr } = await supabase.rpc("consume_coupon", {
        p_coupon_id: appliedCoupon.id,
      });
      if (consumeErr || !consumed) {
        logStep("Coupon consume failed", { code: appliedCoupon.code, error: consumeErr?.message });
        throw new Error("That code has reached its redemption limit");
      }
    }

    let session;
    try {
      // Flag-gated Stripe Tax (ENABLE_STRIPE_TAX secret). Off by default —
      // identical session params. Fee math untouched: the 5% application fee
      // above is computed from the pre-tax (coupon-discounted) amount; Stripe
      // adds tax on top for the buyer.
      session = await createSessionWithTax(stripe, sessionConfig, undefined, "stripe-create-product-checkout");
    } catch (sessionErr) {
      // Session never existed — give the redemption back.
      if (appliedCoupon) {
        await supabase.rpc("release_coupon_redemption", { p_coupon_id: appliedCoupon.id });
      }
      throw sessionErr;
    }
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
