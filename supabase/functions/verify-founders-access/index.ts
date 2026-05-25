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
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      throw new Error("session_id required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const sessionUserId = session.metadata?.user_id;
    if (sessionUserId !== user.id) {
      throw new Error("Session does not belong to user");
    }
    if (session.metadata?.plan_type !== "founders_access") {
      throw new Error("Not a founders access session");
    }
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return new Response(
        JSON.stringify({ granted: false, reason: "Payment not complete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const plan = session.metadata?.founders_plan || "monthly";

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        is_approved: true,
        beta_access_granted_at: new Date().toISOString(),
        founders_access: true,
        founders_plan: plan,
        founders_since: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ granted: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[VERIFY-FOUNDERS]", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
