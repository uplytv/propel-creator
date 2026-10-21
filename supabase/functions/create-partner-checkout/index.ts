// UPLY × Nexaflow AI — Revenue System checkout.
// Creates a single Stripe Checkout session containing the one-time setup fee
// plus the recurring (monthly or annual) subscription price.
// Completely independent of the Stripe/Mux webhook handlers.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Live Stripe price IDs created for this partnership offer.
const PRICES: Record<string, { setup: string; monthly: string; annual: string }> = {
  growth: {
    setup: "price_1U8NSn4C2GQMnrEDcjuhdxzV", // $1,500 one-time
    monthly: "price_1U8NSp4C2GQMnrEDrgubRqqB", // $297/mo
    annual: "price_1U8NSr4C2GQMnrEDXR5YzPNd", // $2,970/yr
  },
  pro: {
    setup: "price_1U8NSs4C2GQMnrEDzzN1cDYa", // $2,500 one-time
    monthly: "price_1U8NSu4C2GQMnrED0Z91SC6Y", // $497/mo
    annual: "price_1U8NSv4C2GQMnrEDsNR4bi4T", // $4,970/yr
  },
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const { tier, billing_period, email } = await req.json();
    const plan = PRICES[String(tier)];
    if (!plan) throw new Error("Unknown tier");
    const period = billing_period === "annual" ? "annual" : "monthly";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://uply.tv";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email || undefined,
      line_items: [
        { price: period === "annual" ? plan.annual : plan.monthly, quantity: 1 },
        { price: plan.setup, quantity: 1 },
      ],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { plan_type: "nexaflow_revenue_system", tier: String(tier), billing_period: period },
      },
      metadata: { plan_type: "nexaflow_revenue_system", tier: String(tier), billing_period: period },
      success_url: `${origin}/partners/nexaflow?checkout=success`,
      cancel_url: `${origin}/partners/nexaflow?checkout=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("create-partner-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
