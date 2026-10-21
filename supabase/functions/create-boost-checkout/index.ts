import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIERS: Record<string, { amount: number; days: number; label: string }> = {
  starter: { amount: 1000, days: 1, label: "Starter Boost (24h)" },
  growth: { amount: 2500, days: 3, label: "Growth Boost (3 days)" },
  pro: { amount: 5000, days: 7, label: "Pro Boost (7 days)" },
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content_id, content_type, tier } = await req.json();
    if (!content_id || !content_type || !TIERS[tier]) {
      return new Response(JSON.stringify({ error: "Invalid params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const tierConfig = TIERS[tier];

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://uply.tv";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `UPLY Discovery Boost — ${tierConfig.label}`,
              description: `Promote your ${content_type} on UPLY for ${tierConfig.days} day(s).`,
            },
            unit_amount: tierConfig.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        boost_content_id: content_id,
        boost_content_type: content_type,
        boost_tier: tier,
        boost_creator_id: user.id,
        boost_days: String(tierConfig.days),
      },
      success_url: `${origin}/boost-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/boost-cancel`,
    });

    // Insert pending boost row using service-role to bypass RLS issues
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    await admin.from("content_boosts").insert({
      creator_id: user.id,
      content_id,
      content_type,
      tier,
      amount_usd: tierConfig.amount / 100,
      status: "pending",
      stripe_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
