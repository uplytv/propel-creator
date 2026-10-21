// Creates a Stripe Checkout session for a UPLY Founder Service offer.
// Direct platform charge — NOT routed through Stripe Connect / no creator
// split. Isolated from the existing creator money path (stripe-webhook,
// creator_stripe_accounts, application fees).
//
// Body: { offerKey: "done-for-you-course" | "assisted-setup" }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirror of FOUNDER_OFFERS for server-side validation. If you change an
// offer price/ID in src/data/founderOffers.ts you must also update this map.
const OFFERS: Record<string, { stripePriceId: string; name: string }> = {
  "done-for-you-course": {
    stripePriceId: "price_1To7wJ4C2GQMnrEDtvSzzzyl",
    name: "Done-for-you Course Build",
  },
  "assisted-setup": {
    stripePriceId: "price_1To87F4C2GQMnrED6ROg8XIl",
    name: "Assisted Course Setup",
  },
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { offerKey } = await req.json();
    if (!offerKey || typeof offerKey !== "string") {
      throw new Error("offerKey is required");
    }
    const offer = OFFERS[offerKey];
    if (!offer) throw new Error(`Unknown or unavailable offer: ${offerKey}`);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Best-effort: capture logged-in user's email so Stripe can prefill it
    // and we can attribute the purchase post-checkout.
    let userEmail: string | undefined;
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        if (data.user?.email) {
          userEmail = data.user.email;
          userId = data.user.id;
        }
      } catch {
        // Guest checkout is fine — Stripe will collect email itself.
      }
    }

    const origin = req.headers.get("origin") || "https://uply.tv";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: offer.stripePriceId, quantity: 1 }],
      customer_email: userEmail,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      success_url: `${origin}/founder-offers/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/founder-offers/canceled`,
      metadata: {
        offer: "founder-service",
        offer_key: offerKey,
        offer_name: offer.name,
        user_id: userId ?? "",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-founder-offer-checkout]", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}));
