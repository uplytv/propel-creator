import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[WHITELABEL-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// White-label plan price (USD cents / month). Override with WHITELABEL_PRICE_CENTS
// or point WHITELABEL_PRICE_ID at a pre-made Stripe price to use that instead.
const DEFAULT_PRICE_CENTS = 49700;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR", { message: "STRIPE_SECRET_KEY not set" });
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    logStep("Request received");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { embedded } = await req.json().catch(() => ({}));

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reuse the customer if one already exists for this email
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
    logStep("Customer lookup", { customerId: customerId || "new" });

    const origin = req.headers.get("origin") || "https://uply.tv";

    // Prefer a pre-made Stripe price if configured; otherwise build it inline so
    // the plan works out of the box without a Stripe dashboard step.
    const presetPriceId = Deno.env.get("WHITELABEL_PRICE_ID");
    const priceCents = Number(Deno.env.get("WHITELABEL_PRICE_CENTS") ?? DEFAULT_PRICE_CENTS);

    const lineItem = presetPriceId
      ? { price: presetPriceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: {
              name: "UPLY White-Label",
              description: "Rebrand UPLY as your own branded platform — your logo, your domain, your brand.",
            },
            unit_amount: priceCents,
            recurring: { interval: "month" as const },
          },
          quantity: 1,
        };

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [lineItem],
      mode: "subscription",
      success_url: `${origin}/dashboard?upgraded=whitelabel`,
      cancel_url: `${origin}/upgrade`,
      metadata: {
        user_id: user.id,
        plan_type: "whitelabel",
      },
    };

    if (embedded) {
      sessionConfig.ui_mode = "embedded";
      sessionConfig.return_url = `${origin}/dashboard?upgraded=whitelabel&session_id={CHECKOUT_SESSION_ID}`;
      delete sessionConfig.success_url;
      delete sessionConfig.cancel_url;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id });

    if (embedded) {
      return new Response(JSON.stringify({ client_secret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: (error as Error).message });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
