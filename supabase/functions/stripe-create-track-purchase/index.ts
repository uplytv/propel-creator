import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user?.email) throw new Error("Unauthorized");
    const user = userData.user;

    const { track_id } = await req.json();
    if (!track_id) throw new Error("track_id required");

    const { data: track } = await supabase
      .from("tracks")
      .select("id, title, price_cents, is_paid, creator_id, cover_art_url, is_locked, unlock_type, unlock_price_cents")
      .eq("id", track_id)
      .maybeSingle();
    if (!track) throw new Error("Track not found");

    // Resolve the price: locked tracks use unlock_price_cents; legacy paid tracks use price_cents.
    const lockedPurchaseAllowed = track.is_locked && (track.unlock_type === "purchase" || track.unlock_type === "both");
    const priceCents = lockedPurchaseAllowed
      ? (track.unlock_price_cents || 0)
      : (track.is_paid ? (track.price_cents || 0) : 0);

    if (!priceCents || priceCents <= 0) {
      throw new Error("Track is not available for purchase");
    }

    const { data: stripeAcct } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id")
      .eq("creator_id", track.creator_id)
      .maybeSingle();
    if (!stripeAcct?.stripe_account_id) throw new Error("Artist has not connected payouts");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://uply.tv";
    const feeCents = Math.round(priceCents * 0.05);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: track.title,
            images: track.cover_art_url ? [track.cover_art_url] : undefined,
          },
        },
        quantity: 1,
      }],
      }],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: stripeAcct.stripe_account_id },
      },
      success_url: `${origin}/music/track/${track.id}?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/music/track/${track.id}`,
      metadata: {
        purchase_type: "track",
        track_id: track.id,
        buyer_id: user.id,
        creator_id: track.creator_id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
