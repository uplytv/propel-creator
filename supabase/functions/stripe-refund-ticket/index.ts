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
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Unauthorized");

    const { ticket_id } = await req.json();
    if (!ticket_id) throw new Error("ticket_id required");

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (error || !ticket) throw new Error("Ticket not found");

    if (ticket.buyer_id !== userData.user.id) throw new Error("Not your ticket");
    if (ticket.status !== "active") throw new Error("Ticket is not active");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Refund if paid
    if (ticket.stripe_payment_intent_id) {
      await stripe.refunds.create({
        payment_intent: ticket.stripe_payment_intent_id,
      });
    }

    // Update ticket
    await supabase
      .from("tickets")
      .update({ status: "refunded" })
      .eq("id", ticket_id);

    // Decrement tickets_sold
    const { data: event } = await supabase
      .from("events")
      .select("tickets_sold")
      .eq("id", ticket.event_id)
      .single();

    if (event) {
      await supabase
        .from("events")
        .update({
          tickets_sold: Math.max(0, event.tickets_sold - 1),
          is_sold_out: false,
        })
        .eq("id", ticket.event_id);
    }

    // Notify first waitlist person
    const { data: firstWaiter } = await supabase
      .from("event_waitlist")
      .select("*")
      .eq("event_id", ticket.event_id)
      .eq("notified", false)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstWaiter) {
      await supabase
        .from("event_waitlist")
        .update({ notified: true })
        .eq("id", firstWaiter.id);

      await supabase.from("notifications").insert({
        user_id: firstWaiter.user_id,
        type: "event_waitlist",
        title: "A spot just opened! 🎉",
        message: "A ticket is now available. Grab it before it's gone!",
        link: `/discover`,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
