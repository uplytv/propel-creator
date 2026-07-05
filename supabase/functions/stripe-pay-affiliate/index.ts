import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // AUTH: admin only — this triggers a real Stripe transfer of platform funds.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { conversion_id } = await req.json();
    if (!conversion_id) throw new Error("conversion_id required");

    // Get conversion
    const { data: conversion, error: convErr } = await supabaseAdmin
      .from("affiliate_conversions")
      .select("*")
      .eq("id", conversion_id)
      .single();
    if (convErr || !conversion) throw new Error("Conversion not found");
    if (conversion.status === "paid") throw new Error("Already paid");
    if (conversion.status !== "approved") throw new Error("Conversion is not approved for payout");
    if (conversion.commission_amount <= 0) throw new Error("No commission to pay");

    // Get affiliate's Stripe account
    const { data: stripeAccount } = await supabaseAdmin
      .from("creator_stripe_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("creator_id", conversion.referring_user_id)
      .maybeSingle();

    if (!stripeAccount || !stripeAccount.payouts_enabled) {
      // Mark as pending Stripe connect
      await supabaseAdmin
        .from("affiliate_conversions")
        .update({ status: "pending_stripe_connect" })
        .eq("id", conversion_id);

      return new Response(JSON.stringify({ 
        error: "Affiliate has no connected Stripe account with payouts enabled",
        status: "pending_stripe_connect" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create transfer to affiliate
    const transfer = await stripe.transfers.create({
      amount: Math.round(conversion.commission_amount * 100), // cents
      currency: "usd",
      destination: stripeAccount.stripe_account_id,
      metadata: {
        conversion_id: conversion.id,
        affiliate_code: conversion.affiliate_code,
      },
    });

    // Update conversion status
    await supabaseAdmin
      .from("affiliate_conversions")
      .update({ status: "paid" })
      .eq("id", conversion_id);

    console.log(`[STRIPE-PAY-AFFILIATE] Transfer ${transfer.id} created for conversion ${conversion_id}`);

    return new Response(JSON.stringify({ transfer_id: transfer.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[STRIPE-PAY-AFFILIATE] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
