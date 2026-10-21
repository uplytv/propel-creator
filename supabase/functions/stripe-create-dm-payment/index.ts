import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withCors(async (req) => {
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

    const { creator_id, sender_id, message, amount } = await req.json();
    if (!creator_id || !message || !amount) throw new Error("Missing required fields");

    // Check if creator has Stripe Connect
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("creator_id", creator_id)
      .maybeSingle();

    const hasConnect = stripeAccount?.stripe_account_id && stripeAccount?.charges_enabled;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const platformFee = Math.round(amount * 5); // 5% in cents
    const amountCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://uply.tv";

    const sessionConfig: any = {
      customer_email: userData.user.email!,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Paid Message to Creator` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/messages?dm_sent=true`,
      cancel_url: `${origin}/messages`,
      metadata: {
        purchase_type: "paid_dm",
        sender_id,
        creator_id,
        message: message.slice(0, 500),
        amount: String(amount),
      },
    };

    if (hasConnect) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: { destination: stripeAccount!.stripe_account_id },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
