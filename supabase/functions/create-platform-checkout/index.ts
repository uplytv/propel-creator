import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PLATFORM-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

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

    const { price_id, embedded, plan, trial, company, full_name, phone } = await req.json();

    // New platform plans (inline price_data, 14-day free trial).
    // Keep amounts in sync with src/components/pricing/plans.ts.
    const PLATFORM_PLAN_PRICING: Record<string, { name: string; unit_amount: number }> = {
      starter: { name: "UPLY Starter", unit_amount: 9700 },
      unlimited: { name: "UPLY Unlimited", unit_amount: 29700 },
      agency_pro: { name: "UPLY Agency Pro", unit_amount: 49700 },
    };

    const planPricing = plan ? PLATFORM_PLAN_PRICING[plan] : undefined;
    if (plan && !planPricing) throw new Error(`Unknown plan: ${plan}`);
    if (!planPricing && !price_id) throw new Error("plan or price_id required");
    logStep("Plan resolved", { plan: plan || null, price_id: price_id || null, trial: !!trial });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new" });

    const origin = req.headers.get("origin") || "https://uply.tv";
    logStep("Origin", { origin });

    // Legacy path uses a fixed Stripe price ID; new plans use inline price_data.
    const lineItems = planPricing
      ? [{
          price_data: {
            currency: "usd",
            product_data: {
              name: planPricing.name,
              metadata: { platform_plan: plan },
            },
            unit_amount: planPricing.unit_amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }]
      : [{ price: price_id, quantity: 1 }];

    const metadata: Record<string, string> = {
      user_id: user.id,
      plan_type: "platform",
    };
    if (plan) metadata.platform_plan = plan;
    if (company) metadata.company = String(company).slice(0, 500);
    if (full_name) metadata.full_name = String(full_name).slice(0, 500);
    if (phone) metadata.phone = String(phone).slice(0, 500);

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/pricing`,
      metadata,
    };

    // Mirror plan identity + trial onto the subscription itself so
    // check-platform-subscription can recognize inline-price subscriptions.
    if (planPricing) {
      sessionConfig.subscription_data = {
        metadata,
        ...(trial ? { trial_period_days: 14 } : {}),
      };
    }

    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${origin}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`;
      delete sessionConfig.success_url;
      delete sessionConfig.cancel_url;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url ? "present" : "missing" });

    if (embedded) {
      return new Response(JSON.stringify({ client_secret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
