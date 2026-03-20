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

    const user = userData.user;
    const { event_id, success_url, cancel_url } = await req.json();

    if (!event_id) throw new Error("event_id required");

    // Get event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();
    if (eventError || !event) throw new Error("Event not found");

    if (event.is_free) throw new Error("This is a free event");
    if (event.is_sold_out) throw new Error("Event is sold out");
    if (event.status !== "published") throw new Error("Event is not published");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe Price
    let priceId = event.stripe_price_id;
    if (!priceId) {
      const product = await stripe.products.create({
        name: `Ticket: ${event.title}`,
        metadata: { event_id: event.id, creator_id: event.creator_id },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(event.ticket_price * 100),
        currency: "usd",
      });
      priceId = price.id;
      await supabase.from("events").update({ stripe_price_id: priceId }).eq("id", event.id);
    }

    // Get creator's stripe account
    const { data: stripeAccount } = await supabase
      .from("creator_stripe_accounts")
      .select("stripe_account_id")
      .eq("creator_id", event.creator_id)
      .maybeSingle();

    const fee = Math.round(event.ticket_price * 0.05 * 100); // 5% platform fee in cents

    const sessionConfig: any = {
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${req.headers.get("origin")}/discover`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/discover`,
      metadata: {
        purchase_type: "event_ticket",
        event_id: event.id,
        buyer_id: user.id,
        creator_id: event.creator_id,
      },
    };

    if (stripeAccount?.stripe_account_id) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: fee,
        transfer_data: { destination: stripeAccount.stripe_account_id },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Event checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
