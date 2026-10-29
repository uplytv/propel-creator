import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkEdgeRateLimit, requestIp } from "../_shared/rateLimit.ts";
import { createSessionWithTax } from "../_shared/stripeTax.ts";

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

    // Auth is OPTIONAL for the new trial plans (guest checkout by email —
    // existing free accounts must not be blocked from starting a paid trial).
    // Legacy price_id checkouts still require an authenticated user.
    const authHeader = req.headers.get("Authorization");
    let user: { id: string; email?: string | null } | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      user = userData?.user ?? null;
    }
    logStep(user ? "User authenticated" : "No authenticated user (guest path candidate)", { userId: user?.id });

    // Rate limit BEFORE any Stripe API work. Authenticated users are keyed by
    // user id; the unauthenticated guest-trial path is keyed by IP (tighter cap).
    // Fail-open on infra errors so a broken limiter never blocks checkout.
    const rlIdentifier = user ? user.id : `ip:${requestIp(req)}`;
    const rlAllowed = await checkEdgeRateLimit(supabase, rlIdentifier, "create-platform-checkout", {
      maxCalls: user ? 20 : 10,
      windowMs: 10 * 60_000,
    });
    if (!rlAllowed) {
      logStep("Rate limited", { identifier: user ? "user" : "ip" });
      return new Response(
        JSON.stringify({ error: "Too many checkout attempts. Please wait a few minutes and try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 },
      );
    }

    const {
      // company and phone are OPTIONAL — they are only stamped onto metadata
      // when supplied. sms_consent is an explicit opt-in captured next to the
      // phone field; a phone alone never implies SMS consent.
      price_id, embedded, plan, trial, company, full_name, phone,
      sms_consent: smsConsentRaw,
      email: guestEmailRaw,
      // Additive: affiliate attribution + extended-trial support (founding offer).
      affiliate_code: affiliateCodeRaw,
      trial_days: trialDaysRaw,
    } = await req.json();

    // Affiliate code: client passes the uply_ref cookie value. It is ONLY
    // stamped as metadata for the scheduled affiliate-commission-reconciler —
    // it has ZERO effect on pricing, the trial, or the checkout session shape.
    // Commissions are a PLATFORM marketing cost paid by UPLY out of its own
    // plan revenue ($97/$297/$497) — never creator money, never the 95/5 split.
    // No client-supplied amounts are trusted anywhere in this flow.
    const affiliateCode =
      typeof affiliateCodeRaw === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(affiliateCodeRaw.trim())
        ? affiliateCodeRaw.trim()
        : null;

    // Trial length is CLAMPED server-side to the two sanctioned values:
    // 14 (standard) or 30 (founding-offer extended trial). Anything else → 14.
    const trialDays = Number(trialDaysRaw) === 30 ? 30 : 14;

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

    // Guest checkout is permitted ONLY for the new trial plans, keyed by email.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const guestEmail = typeof guestEmailRaw === "string" ? guestEmailRaw.trim().toLowerCase() : "";
    if (!user && !(planPricing && trial && EMAIL_RE.test(guestEmail))) {
      throw new Error("Unauthorized");
    }
    const checkoutEmail = (user?.email || guestEmail).toLowerCase();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: checkoutEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new" });

    // Guest guard: if this email already carries a live platform plan, they must
    // sign in instead (prevents duplicate subscriptions on someone's account).
    if (!user && customerId) {
      const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
      const hasLivePlatformPlan = existingSubs.data.some(
        (s: any) =>
          (s.status === "active" || s.status === "trialing") &&
          (s.metadata?.plan_type === "platform" || s.metadata?.platform_plan),
      );
      if (hasLivePlatformPlan) {
        logStep("Guest blocked — already subscribed", { customerId });
        return new Response(JSON.stringify({ error: "already_subscribed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

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
      plan_type: "platform",
    };
    if (user) metadata.user_id = user.id;
    else metadata.guest_email = checkoutEmail;
    if (plan) metadata.platform_plan = plan;
    if (company) metadata.company = String(company).slice(0, 500);
    if (full_name) metadata.full_name = String(full_name).slice(0, 500);
    if (phone) {
      metadata.phone = String(phone).slice(0, 500);
      metadata.sms_consent = smsConsentRaw === true ? "true" : "false";
    }
    // Attribution only — read later by the affiliate-commission-reconciler
    // (cron). Pricing, split math, and the webhook are untouched.
    if (affiliateCode) metadata.affiliate_code = affiliateCode;

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : checkoutEmail,
      line_items: lineItems,
      mode: "subscription",
      // Hosted trial checkout returns to the dashboard trial toast. Non-trial
      // hosted sessions (legacy price_id included) keep the upgrade return.
      // Embedded mode deletes both URLs below.
      success_url: planPricing && trial
        ? `${origin}/dashboard?trial=started`
        : `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/pricing`,
      metadata,
    };

    // Mirror plan identity + trial onto the subscription itself so
    // check-platform-subscription can recognize inline-price subscriptions.
    if (planPricing) {
      sessionConfig.subscription_data = {
        metadata,
        ...(trial ? { trial_period_days: trialDays } : {}),
      };
    }

    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      if (trial) {
        // Trial signup completes INSIDE the modal — no top-level redirect.
        // The app's onComplete callback shows the in-modal success step.
        sessionConfig.redirect_on_completion = 'never';
      } else {
        sessionConfig.return_url = `${origin}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`;
      }
      delete sessionConfig.success_url;
      delete sessionConfig.cancel_url;
    }

    // Flag-gated Stripe Tax (ENABLE_STRIPE_TAX secret). Off by default —
    // identical session params. Fee math untouched: this is a 100% platform
    // subscription (no application fee here), and where fees exist elsewhere
    // they apply to the pre-tax amount; Stripe adds tax on top for the buyer.
    const session = await createSessionWithTax(stripe, sessionConfig, undefined, "create-platform-checkout");

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
