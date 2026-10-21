import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_ID = "price_1ToRuS4C2GQMnrEDlfaTPxvo";

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Anon client to identify caller.
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    // Service client for authoritative reads/writes on blake_subscribers.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(
      token,
    );
    if (userErr) throw new Error(userErr.message);
    const user = userData.user;
    if (!user?.email) throw new Error("No user email");
    const email = user.email.toLowerCase();

    // 1) Prefer webhook-synced row.
    const { data: row } = await supabase
      .from("blake_subscribers")
      .select("status, current_period_end, user_id")
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Backfill user_id if webhook only had email.
    if (row && !row.user_id) {
      await supabase
        .from("blake_subscribers")
        .update({ user_id: user.id })
        .eq("email", email);
    }

    if (row) {
      const active =
        row.status === "active" &&
        (!row.current_period_end || new Date(row.current_period_end) > new Date());
      if (active) {
        return new Response(
          JSON.stringify({
            subscribed: true,
            subscription_end: row.current_period_end,
            source: "db",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }
      // Row exists but isn't active (canceled / past_due / expired).
      // Fall through to Stripe so returning subscribers get unlocked
      // immediately even if the webhook hasn't reconciled yet.
    }

    // 2) Fallback: query Stripe directly (in case webhook hasn't fired yet).
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ subscribed: false, source: "stripe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }
    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      price: PRICE_ID,
      limit: 1,
    });
    const active = subs.data[0];

    // Seed row so subsequent reads are cheap.
    if (active) {
      // Clear stale rows with same email but different subscription id to avoid
      // hitting the unique(lower(email)) index during insert.
      await supabase
        .from("blake_subscribers")
        .delete()
        .eq("email", email)
        .neq("stripe_subscription_id", active.id);
      await supabase.from("blake_subscribers").upsert(
        {
          user_id: user.id,
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: active.id,
          status: "active",
          current_period_end: new Date(active.current_period_end * 1000).toISOString(),
          cancel_at_period_end: active.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
    }

    return new Response(
      JSON.stringify({
        subscribed: !!active,
        subscription_end: active
          ? new Date(active.current_period_end * 1000).toISOString()
          : null,
        source: "stripe",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
}));
