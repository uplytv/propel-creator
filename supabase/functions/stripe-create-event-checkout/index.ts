import { getCreatorPlatformFeeRate } from "../_shared/platformFees.ts";
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
    const { event_id, success_url, cancel_url, embedded, quantity, seat_labels } = await req.json();
    const seats: string[] = Array.isArray(seat_labels)
      ? seat_labels.filter((s) => typeof s === "string" && s.length > 0 && s.length <= 12)
      : [];
    const qty = seats.length > 0
      ? seats.length
      : Math.max(1, Math.min(10, parseInt(String(quantity || 1), 10) || 1));

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
    if (event.ticket_quantity != null && (event.tickets_sold + qty) > event.ticket_quantity) {
      throw new Error("Not enough tickets remaining");
    }

    // Seated-mode validation: seats required, must match map size, must be free
    if (event.ticketing_mode === "seated") {
      if (seats.length === 0) throw new Error("Pick at least one seat");
      const map = (event.seat_map || {}) as { rows?: number; cols?: number };
      const validSet = new Set<string>();
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let r = 0; r < (map.rows ?? 0); r++) {
        const row = r < 26 ? A[r] : `R${r + 1}`;
        for (let c = 0; c < (map.cols ?? 0); c++) validSet.add(`${row}${c + 1}`);
      }
      const bad = seats.find((s) => !validSet.has(s));
      if (bad) throw new Error(`Invalid seat ${bad}`);

      const { data: clashes } = await supabase
        .from("tickets")
        .select("seat_label")
        .eq("event_id", event_id)
        .in("seat_label", seats)
        .in("status", ["active", "scanned", "used", "listed_for_resale"]);
      if (clashes && clashes.length > 0) {
        throw new Error(`Seats already taken: ${clashes.map((c: any) => c.seat_label).join(", ")}`);
      }
    }

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
      .select("stripe_account_id, charges_enabled")
      .eq("creator_id", event.creator_id)
      .maybeSingle();

    if (!stripeAccount?.stripe_account_id || !stripeAccount?.charges_enabled) {
      throw new Error("This organizer can't accept payments yet. Please contact them.");
    }

    const fee = Math.round(event.ticket_price * qty * await getCreatorPlatformFeeRate(supabase, event.creator_id) * 100); // Platform fee in cents

    const sessionConfig: any = {
      mode: "payment",
      line_items: [{
        price: priceId,
        quantity: qty,
        // Disable Stripe's qty adjuster when seats are pre-selected (must match exactly)
        ...(seats.length === 0 ? { adjustable_quantity: { enabled: true, minimum: 1, maximum: 10 } } : {}),
      }],
      success_url: success_url || `${req.headers.get("origin")}/tickets/success?event=${event.id}`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/discover`,
      metadata: {
        purchase_type: "event_ticket",
        event_id: event.id,
        buyer_id: user.id,
        creator_id: event.creator_id,
        quantity: String(qty),
        // Stripe metadata cap is 500 chars; seats labels are tiny so this is safe
        seat_labels: seats.join(","),
      },
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: stripeAccount.stripe_account_id },
      },
    };

    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${req.headers.get("origin")}/tickets/success?event=${event.id}&session_id={CHECKOUT_SESSION_ID}`;
      delete sessionConfig.success_url;
      delete sessionConfig.cancel_url;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (embedded) {
      return new Response(JSON.stringify({ client_secret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
