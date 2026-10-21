import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withCors(async (req) => {
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
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const { session_id, track_id } = await req.json();
    if (!session_id || !track_id) throw new Error("session_id and track_id required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const meta = (session.metadata ?? {}) as Record<string, string>;
    if (meta.buyer_id && meta.buyer_id !== user.id) throw new Error("Buyer mismatch");
    if (meta.track_id && meta.track_id !== track_id) throw new Error("Track mismatch");

    const { data: track } = await supabase
      .from("tracks")
      .select("id, creator_id, price_cents")
      .eq("id", track_id)
      .maybeSingle();
    if (!track) throw new Error("Track not found");

    const amount = session.amount_total ?? track.price_cents ?? 0;
    const pi = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

    await supabase.from("track_purchases").insert({
      track_id: track.id,
      buyer_id: user.id,
      creator_id: track.creator_id,
      amount_cents: amount,
      stripe_session_id: session.id,
      stripe_payment_intent_id: pi,
    });

    return new Response(JSON.stringify({ paid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
