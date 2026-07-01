import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) =>
  console.log(`[CREDITS-CHECKOUT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user?.email) throw new Error("Unauthorized");
    const user = userData.user;

    const { package_id } = await req.json();
    if (!package_id) throw new Error("package_id required");

    const { data: pkg, error: pkgErr } = await supabase
      .from("credit_packages")
      .select("*")
      .eq("id", package_id)
      .maybeSingle();
    if (pkgErr || !pkg) throw new Error("Package not found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Auto-provision Stripe product/price if the pack doesn't have one yet.
    let stripePriceId: string | null = pkg.stripe_price_id;
    if (!stripePriceId) {
      log("Provisioning Stripe price for pack", { id: pkg.id, label: pkg.label });
      const product = await stripe.products.create({
        name: `${pkg.label} — ${pkg.credits} credits`,
        description: `${pkg.credits} UPLY credits`,
        metadata: { credit_package_id: pkg.id, credits: String(pkg.credits) },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number(pkg.price_usd) * 100),
        currency: "usd",
      });
      stripePriceId = price.id;
      await supabase
        .from("credit_packages")
        .update({ stripe_price_id: price.id })
        .eq("id", pkg.id);
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/buy-credits?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/buy-credits?canceled=true`,
      metadata: {
        purchase_type: "credits",
        buyer_id: user.id,
        credit_package_id: pkg.id,
        credits: String(pkg.credits),
      },
    });

    log("Session created", { id: session.id, priceId: stripePriceId });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    log("ERROR", { message: err.message });
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
