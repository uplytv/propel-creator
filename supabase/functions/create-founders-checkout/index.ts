import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHLY_PRICE_ID = "price_1TasQ74C2GQMnrEDEFZjxofZ";
// Optional: set STRIPE_FOUNDERS_ANNUAL_PRICE_ID secret to enable annual plan
const ANNUAL_PRICE_ID = Deno.env.get("STRIPE_FOUNDERS_ANNUAL_PRICE_ID") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData.user?.email) throw new Error("Unauthorized");
    const user = userData.user;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }
    const plan: "monthly" | "annual" = body?.plan === "annual" ? "annual" : "monthly";

    const priceId = plan === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;
    if (!priceId) {
      return new Response(JSON.stringify({
        error: "Annual plan not configured yet. Please choose Monthly or contact support.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/waitlist?founders_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/founders?cancelled=1`,
      metadata: {
        user_id: user.id,
        plan_type: "founders_access",
        founders_plan: plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: "founders_access",
          founders_plan: plan,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[FOUNDERS-CHECKOUT]", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
