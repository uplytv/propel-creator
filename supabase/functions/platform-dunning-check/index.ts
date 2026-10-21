// platform-dunning-check — scheduled (daily via pg_cron) checker for failed
// platform-plan payments ($97/$297/$497 creator subscriptions).
//
// Deliberately NOT part of the Stripe webhook (that handler is frozen).
// Finds past_due/unpaid platform subscriptions, resolves the creator, and
// sends dunning touches on day 0 / 3 / 7 (email via Resend + in-app
// notification). Touches are tracked in public.dunning_notices with
// UNIQUE(subscription_id, touch_number) so re-runs never double-send.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dunning-cron-secret",
};

// Same identification rules as check-platform-subscription:
// legacy fixed-price products (pre-2026 plans) …
const PLATFORM_PRODUCTS: Record<string, string> = {
  "prod_UAMcfWZHDj9N3P": "pro",
  "prod_UAMdsCQEOof66s": "scale",
};
// … and new plans recognized via subscription metadata stamped at checkout.
const PLATFORM_PLAN_KEYS = new Set(["starter", "unlimited", "agency_pro"]);

const PLAN_LABELS: Record<string, string> = {
  starter: "UPLY Starter ($97/mo)",
  unlimited: "UPLY Unlimited ($297/mo)",
  agency_pro: "UPLY Agency Pro ($497/mo)",
  pro: "UPLY Pro",
  scale: "UPLY Scale",
};

// Touch cadence: touch 1 immediately on first detection, touch 2 at +3 days,
// touch 3 (final) at +7 days. Days measured from touch 1's sent_at.
const TOUCHES = [
  { number: 1, afterDays: 0, daysLeft: 7 },
  { number: 2, afterDays: 3, daysLeft: 4 },
  { number: 3, afterDays: 7, daysLeft: 0 },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function emailHtml(opts: {
  firstName: string;
  planLabel: string;
  daysLeft: number;
  isFinal: boolean;
  portalUrl: string;
}) {
  const { firstName, planLabel, daysLeft, isFinal, portalUrl } = opts;
  const urgency = isFinal
    ? `This is the final notice — your plan pauses <strong>today</strong> unless your card is updated.`
    : `Your plan pauses in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong> unless your card is updated.`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;">
<div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
<div style="height:4px;background:linear-gradient(90deg,#3D7CFF,#B025FF);"></div>
<div style="padding:32px 28px;">
  <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px;">Your payment didn't go through, ${firstName}</h1>
  <p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0 0 16px;">
    We tried to charge your card for <strong style="color:#ffffff;">${planLabel}</strong> and it failed.
    ${urgency} When your plan pauses, your community, courses, and payouts go on hold for your members.
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(90deg,#3D7CFF,#B025FF);color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;">Update card →</a>
  </div>
  <p style="color:#888;font-size:12px;line-height:1.6;margin:0;">
    If that link has expired, sign in at <a href="https://uply.tv/settings" style="color:#3D7CFF;">uply.tv/settings</a> and choose Manage billing.
    Already updated your card? You can ignore this email — we retry automatically.
  </p>
</div>
<div style="padding:24px 28px;border-top:1px solid #1E1E1E;text-align:center;">
  <span style="color:#555;font-size:11px;">Powered by UPLY</span>
</div>
</div></body></html>`;
}

function emailText(opts: { firstName: string; planLabel: string; daysLeft: number; isFinal: boolean; portalUrl: string }) {
  const urgency = opts.isFinal
    ? "This is the final notice — your plan pauses today unless your card is updated."
    : `Your plan pauses in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"} unless your card is updated.`;
  return `Hi ${opts.firstName},

We tried to charge your card for ${opts.planLabel} and it failed. ${urgency}

Update your card here: ${opts.portalUrl}

If that link has expired, sign in at https://uply.tv/settings and choose Manage billing.
Already updated your card? Ignore this email — we retry automatically.

— UPLY`;
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // AuthZ: cron-secret header OR authenticated admin caller (blake-subscription-alerts pattern).
    const cronSecret = req.headers.get("x-dunning-cron-secret");
    const expectedSecret = Deno.env.get("PLATFORM_DUNNING_CRON_SECRET");
    let authorized = !!(cronSecret && expectedSecret && cronSecret === expectedSecret);

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const anon = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );
        const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
        if (userData?.user) {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          authorized = !!isAdmin;
        }
      }
    }
    if (!authorized) return json({ error: "Unauthorized" }, 401);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1. Collect past_due + unpaid subscriptions that are platform plans.
    const troubled: Stripe.Subscription[] = [];
    for (const status of ["past_due", "unpaid"] as const) {
      let startingAfter: string | undefined;
      // Paginate defensively (100/page, hard cap 10 pages per status).
      for (let page = 0; page < 10; page++) {
        const res = await stripe.subscriptions.list({
          status,
          limit: 100,
          expand: ["data.customer"],
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        troubled.push(...res.data);
        if (!res.has_more || res.data.length === 0) break;
        startingAfter = res.data[res.data.length - 1].id;
      }
    }

    const platformSubs = troubled.filter((sub) => {
      const metaPlan = (sub.metadata?.platform_plan || "").toLowerCase();
      if (PLATFORM_PLAN_KEYS.has(metaPlan)) return true;
      if ((sub.metadata?.plan_type || "") === "platform") return true;
      const productId = sub.items.data[0]?.price?.product as string;
      return !!PLATFORM_PRODUCTS[productId];
    });

    // 2. Reset cadence for subscriptions that recovered (or churned) — any
    // tracked subscription no longer past_due/unpaid gets its notices cleared
    // so a future failure starts a fresh day-0/3/7 cycle.
    const troubledIds = platformSubs.map((s) => s.id);
    const { data: trackedRows } = await supabase
      .from("dunning_notices")
      .select("subscription_id");
    const trackedIds = [...new Set((trackedRows || []).map((r: any) => r.subscription_id))];
    const recoveredIds = trackedIds.filter((id) => !troubledIds.includes(id));
    if (recoveredIds.length > 0) {
      await supabase.from("dunning_notices").delete().in("subscription_id", recoveredIds);
    }

    const results: any[] = [];

    // 3. Process each troubled platform subscription.
    for (const sub of platformSubs) {
      try {
        const customer = sub.customer as Stripe.Customer;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const customerEmail =
          (customer && !("deleted" in customer && customer.deleted) && customer.email) ||
          sub.metadata?.guest_email ||
          null;

        // Resolve the creator: metadata.user_id, else customer email -> auth user.
        let userId: string | null = sub.metadata?.user_id || null;
        if (!userId && customerEmail) {
          const { data: uid } = await supabase.rpc("get_user_id_by_email", {
            p_email: customerEmail,
          });
          userId = uid || null;
        }
        if (!customerEmail) {
          results.push({ subscription: sub.id, skipped: "no customer email" });
          continue;
        }

        // Which touches were already sent?
        const { data: sent } = await supabase
          .from("dunning_notices")
          .select("touch_number, sent_at")
          .eq("subscription_id", sub.id)
          .order("touch_number");
        const sentTouches = new Map<number, string>(
          (sent || []).map((r: any) => [r.touch_number, r.sent_at]),
        );

        // Next due touch: touch 1 immediately; later touches N days after touch 1.
        const firstSentAt = sentTouches.get(1) ? new Date(sentTouches.get(1)!).getTime() : null;
        const dayMs = 86400 * 1000;
        const dueTouch = TOUCHES.find((t) => {
          if (sentTouches.has(t.number)) return false;
          if (t.number === 1) return true;
          if (!firstSentAt) return false; // touch 1 goes first, next run handles 2/3
          return Date.now() >= firstSentAt + t.afterDays * dayMs;
        });
        if (!dueTouch) {
          results.push({ subscription: sub.id, skipped: "no touch due" });
          continue;
        }

        // Claim the touch BEFORE sending — the unique index makes concurrent
        // or repeated runs a no-op (never double-send).
        const { error: claimErr } = await supabase.from("dunning_notices").insert({
          subscription_id: sub.id,
          touch_number: dueTouch.number,
          user_id: userId,
          customer_email: customerEmail,
        });
        if (claimErr) {
          // 23505 = already claimed by a concurrent run — skip quietly.
          results.push({ subscription: sub.id, skipped: `claim failed: ${claimErr.message}` });
          continue;
        }

        const metaPlan = (sub.metadata?.platform_plan || "").toLowerCase();
        const legacyPlan = PLATFORM_PRODUCTS[sub.items.data[0]?.price?.product as string];
        const planKey = PLATFORM_PLAN_KEYS.has(metaPlan) ? metaPlan : legacyPlan || "platform";
        const planLabel = PLAN_LABELS[planKey] || "your UPLY plan";
        const firstName = (sub.metadata?.full_name || "").split(" ")[0] || "there";
        const isFinal = dueTouch.number === 3;

        // One-click "Update card": fresh Stripe billing portal session per touch
        // (same pattern as stripe-create-portal), with /settings as fallback.
        let portalUrl = "https://uply.tv/settings";
        try {
          const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: "https://uply.tv/settings",
          });
          portalUrl = portal.url;
        } catch (e) {
          console.error(`[platform-dunning-check] portal session failed for ${sub.id}`, e);
        }

        const subject = isFinal
          ? "Final notice: your UPLY plan pauses today — update your card"
          : `Your UPLY payment failed — plan pauses in ${dueTouch.daysLeft} days`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "UPLY <noreply@notify.uply.tv>",
            to: [customerEmail],
            subject,
            html: emailHtml({ firstName, planLabel, daysLeft: dueTouch.daysLeft, isFinal, portalUrl }),
            text: emailText({ firstName, planLabel, daysLeft: dueTouch.daysLeft, isFinal, portalUrl }),
          }),
        });
        const sendResult = await res.json();
        if (!res.ok) {
          // Release the claim so the next run retries this touch.
          await supabase
            .from("dunning_notices")
            .delete()
            .eq("subscription_id", sub.id)
            .eq("touch_number", dueTouch.number);
          results.push({ subscription: sub.id, touch: dueTouch.number, ok: false, error: sendResult?.message || "resend error" });
          continue;
        }

        // In-app notification (only when we resolved the auth user).
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "billing",
            title: "Payment failed — update your card",
            message: isFinal
              ? `Final notice: your ${planLabel} payment failed and your plan pauses today. Update your card in Settings → Billing.`
              : `Your ${planLabel} payment failed. Your plan pauses in ${dueTouch.daysLeft} days unless your card is updated in Settings → Billing.`,
            link: "/settings",
            reference_id: sub.id,
          });
        }

        results.push({ subscription: sub.id, touch: dueTouch.number, ok: true, email: customerEmail, user_id: userId });
      } catch (subErr) {
        console.error(`[platform-dunning-check] error on ${sub.id}`, subErr);
        results.push({ subscription: sub.id, ok: false, error: subErr instanceof Error ? subErr.message : String(subErr) });
      }
    }

    return json({
      scanned: troubled.length,
      platform_past_due: platformSubs.length,
      cadence_resets: recoveredIds.length,
      results,
    });
  } catch (e) {
    console.error("[platform-dunning-check] error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}));
