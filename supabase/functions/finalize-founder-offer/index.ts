// Called once by the success page after Stripe Checkout returns.
// Verifies the session is paid, records the purchase, and triggers both
// the buyer confirmation email and the internal team notification.
// Idempotent on stripe_session_id (UNIQUE constraint + ON CONFLICT).
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
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer_details", "payment_intent", "payment_intent.latest_charge"],
    });

    if (session.payment_status !== "paid") {
      throw new Error(`Session not paid: ${session.payment_status}`);
    }
    if (session.metadata?.offer !== "founder-service") {
      throw new Error("Session is not a founder-service offer");
    }

    const buyerEmail =
      session.customer_details?.email ??
      (session.customer_email as string | undefined) ??
      "";
    const buyerName = session.customer_details?.name ?? null;
    const buyerPhone = session.customer_details?.phone ?? null;
    const offerKey = session.metadata?.offer_key ?? "unknown";
    const offerName = session.metadata?.offer_name ?? "Founder Service";
    const userId = session.metadata?.user_id || null;
    const amountCents = session.amount_total ?? 0;
    const currency = (session.currency ?? "usd").toLowerCase();
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const latestCharge =
      typeof session.payment_intent === "object" && session.payment_intent
        ? (session.payment_intent as any).latest_charge
        : null;
    const receiptUrl: string | null =
      latestCharge && typeof latestCharge === "object"
        ? (latestCharge.receipt_url as string | null) ?? null
        : null;

    // Record the purchase (service role bypasses RLS).
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Idempotent insert via upsert on the unique stripe_session_id.
    const { error: insertErr } = await supabaseAdmin
      .from("founder_offer_purchases")
      .upsert(
        {
          user_id: userId,
          offer_key: offerKey,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          contact_phone: buyerPhone,
          amount_cents: amountCents,
          currency,
          stripe_session_id: sessionId,
          stripe_payment_intent: paymentIntent,
          status: "paid",
        },
        { onConflict: "stripe_session_id" },
      );
    if (insertErr) {
      console.error("[finalize-founder-offer] insert error", insertErr);
      // Continue to send emails anyway — purchase already went through.
    }

    // Fire-and-forget both emails via the existing transactional sender.
    const notifyEmail = Deno.env.get("FOUNDER_OFFER_NOTIFY_EMAIL");
    const sendPromises: Promise<unknown>[] = [];

    sendPromises.push(
      supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "founder-offer-buyer-confirmation",
          recipientEmail: buyerEmail,
          idempotencyKey: `founder-buyer-${sessionId}`,
          templateData: {
            buyerName: buyerName ?? "there",
            offerName,
            amountFormatted: formatAmount(amountCents, currency),
          },
        },
      }),
    );

    if (notifyEmail) {
      sendPromises.push(
        supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "founder-offer-team-notification",
            recipientEmail: notifyEmail,
            idempotencyKey: `founder-team-${sessionId}`,
            templateData: {
              offerName,
              offerKey,
              buyerEmail,
              buyerName: buyerName ?? "(no name)",
              buyerPhone: buyerPhone ?? "(no phone)",
              amountFormatted: formatAmount(amountCents, currency),
              stripeSessionId: sessionId,
              userId: userId ?? "(guest)",
            },
          },
        }),
      );
    } else {
      console.warn(
        "[finalize-founder-offer] FOUNDER_OFFER_NOTIFY_EMAIL not set — skipping team notification",
      );
    }

    await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({
        ok: true,
        email: buyerEmail,
        offerKey,
        offerName,
        amountFormatted: formatAmount(amountCents, currency),
        amountCents,
        currency,
        orderId: sessionId,
        receiptUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err: any) {
    console.error("[finalize-founder-offer]", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}));

function formatAmount(cents: number, currency: string): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(dollars);
}
