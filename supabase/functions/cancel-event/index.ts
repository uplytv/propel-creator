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

    const { event_id } = await req.json();
    if (!event_id) throw new Error("event_id required");

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();
    if (!event) throw new Error("Event not found");
    if (event.creator_id !== userData.user.id) throw new Error("Not your event");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Refund all active tickets
    const { data: activeTickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("event_id", event_id)
      .eq("status", "active");

    for (const ticket of activeTickets || []) {
      if (ticket.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({ payment_intent: ticket.stripe_payment_intent_id });
        } catch (e) {
          console.error("Refund failed for ticket:", ticket.id, e);
        }
      }
      await supabase.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: ticket.buyer_id,
        type: "event_canceled",
        title: "Event Canceled",
        message: `"${event.title}" has been canceled. ${ticket.amount_paid > 0 ? "A full refund has been issued." : ""}`,
      });
    }

    // Cancel event
    await supabase.from("events").update({ status: "canceled" }).eq("id", event_id);

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
