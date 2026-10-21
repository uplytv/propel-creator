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

    const { amount, creator_id, stream_id, message, context, track_id, return_path } = await req.json();
    if (!amount || !creator_id) throw new Error("amount and creator_id required");

    // Optional relative path to return to after checkout (e.g. music pages).
    // Must be a same-origin relative path to avoid open redirects.
    const safeReturnPath =
      typeof return_path === "string" && return_path.startsWith("/") && !return_path.startsWith("//")
        ? return_path
        : null;

    const amountCents = Math.round(amount * 100);
    const feeCents = Math.round(amountCents * 0.05);

    // Get creator's Stripe account
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id")
      .eq("creator_id", creator_id)
      .single();
    if (!stripeAccount) throw new Error("Creator has not connected Stripe");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: userData.user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://uply.tv";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email!,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: `Tip - $${amount}` },
        },
        quantity: 1,
      }],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: stripeAccount.stripe_account_id },
      },
      success_url: safeReturnPath
        ? `${origin}${safeReturnPath}${safeReturnPath.includes("?") ? "&" : "?"}tipped=true`
        : `${origin}/stream/${stream_id || ""}?tipped=true`,
      cancel_url: safeReturnPath ? `${origin}${safeReturnPath}` : `${origin}/stream/${stream_id || ""}`,
      metadata: {
        purchase_type: "tip",
        sender_id: userData.user.id,
        creator_id,
        stream_id: stream_id || "",
        message: message || "",
        amount: String(amount),
        // Reconciliation markers for non-stream tips (e.g. music tips)
        context: context || "",
        track_id: track_id || "",
      },
    });

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
}));
