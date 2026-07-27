// Business claim → subscription checkout.
// Creates a Stripe subscription for the "Business" plan ($97/mo default).
// The subscription is marked with metadata.plan_type=business_claim so the
// existing generic stripe-webhook does not activate any creator entitlement.
// Ownership transfer to the requester happens only on admin approval of the
// associated claim_request. This function is completely independent of the
// Stripe/Mux webhook handlers per project rules.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUSINESS_PLAN_PRICE_CENTS = Number(
  Deno.env.get("BUSINESS_PLAN_PRICE_CENTS") ?? "9700",
);
const BUSINESS_PLAN_NAME = "UPLY Business";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (!user?.email) throw new Error("Unauthorized");

    const { business_id, claim_request_id } = await req.json();
    if (!business_id) throw new Error("business_id required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    const { data: bizProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", business_id)
      .maybeSingle();
    const username = bizProfile?.username ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: BUSINESS_PLAN_NAME,
            metadata: { plan_type: "business_claim" },
          },
          unit_amount: BUSINESS_PLAN_PRICE_CENTS,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      metadata: {
        plan_type: "business_claim",
        business_id,
        claim_request_id: claim_request_id ?? "",
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          plan_type: "business_claim",
          business_id,
          claim_request_id: claim_request_id ?? "",
          user_id: user.id,
        },
      },
      success_url: `${origin}/claim/${username}?checkout=success`,
      cancel_url: `${origin}/claim/${username}?checkout=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
