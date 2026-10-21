// affiliate-commission-reconciler — scheduled (every 6h via pg_cron) 50%
// commission computer for platform-plan referrals.
//
// Deliberately NOT part of the Stripe webhook (that handler is frozen).
// Lists platform subscriptions carrying metadata.affiliate_code (stamped by
// create-platform-checkout), finds each subscription's FIRST PAID invoice via
// the Stripe API, and records a 'platform_subscription' conversion with a
// server-computed commission. Status stays 'pending' — payouts remain
// admin-approved via stripe-pay-affiliate (C-1 architecture preserved).
//
// MONEY MODEL (do not change without explicit instruction):
//   Commission = 50% of the referral's FIRST paid invoice (v1). It is a
//   PLATFORM MARKETING COST paid by UPLY out of its own plan revenue
//   ($97/$297/$497). It NEVER touches creator money and NEVER alters the
//   95/5 creator payout split. No client-supplied amounts are trusted:
//   the only money figure used is Stripe's invoice.amount_paid.
//
// IDEMPOTENCY:
//   * One commission per subscription (v1) — checked before insert.
//   * One row per paid invoice — partial UNIQUE index on paid_invoice_id;
//     a concurrent duplicate insert fails 23505 and is treated as a skip.
//   * Never-throw per item: one bad subscription cannot stall the sweep.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { moneyEventRow, logMoneyEventSafe } from "../_shared/stripeWebhookLogic.ts";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-affiliate-cron-secret",
};

// v1 pays 50% of the FIRST paid invoice only. Recurring (rev-share on every
// invoice) is deliberately parked behind this flag until the program's unit
// economics are proven — the affiliate page copy says exactly that.
const COMMISSION_PCT = 50;
const RECURRING_COMMISSIONS_ENABLED = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // AuthZ: cron-secret header OR authenticated admin caller
    // (platform-dunning-check precedent).
    const cronSecret = req.headers.get("x-affiliate-cron-secret");
    const expectedSecret = Deno.env.get("AFFILIATE_RECONCILER_CRON_SECRET");
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
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1. Collect platform subscriptions that carry an affiliate code.
    //    (Stripe list has no metadata filter — paginate and filter locally.)
    const attributed: Stripe.Subscription[] = [];
    let startingAfter: string | undefined;
    for (let page = 0; page < 20; page++) {
      const res = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const sub of res.data) {
        const md = (sub.metadata ?? {}) as Record<string, string>;
        if (md.affiliate_code && (md.plan_type === "platform" || md.platform_plan)) {
          attributed.push(sub);
        }
      }
      if (!res.has_more || res.data.length === 0) break;
      startingAfter = res.data[res.data.length - 1].id;
    }

    const summary = { scanned: attributed.length, created: 0, skipped: 0, errors: 0 };

    // 2. Per subscription — never-throw per item.
    for (const sub of attributed) {
      try {
        const md = (sub.metadata ?? {}) as Record<string, string>;
        const affiliateCode = md.affiliate_code;

        // v1: one commission per subscription, ever. Already recorded → skip.
        // (When RECURRING_COMMISSIONS_ENABLED ships, this becomes a per-invoice
        // check instead.)
        if (!RECURRING_COMMISSIONS_ENABLED) {
          const { data: existingSub } = await supabase
            .from("affiliate_conversions")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .eq("conversion_type", "platform_subscription")
            .limit(1)
            .maybeSingle();
          if (existingSub) { summary.skipped++; continue; }
        }

        // Find the FIRST paid invoice with real money on it. A trialing sub's
        // $0 signup invoice is status=paid with amount_paid=0 — excluded.
        // invoices.list returns newest-first, so the last qualifying entry
        // is the earliest paid invoice.
        const invoices = await stripe.invoices.list({
          subscription: sub.id,
          status: "paid",
          limit: 100,
        });
        const paidWithMoney = invoices.data.filter((inv) => (inv.amount_paid ?? 0) > 0);
        const firstPaid = paidWithMoney[paidWithMoney.length - 1];
        if (!firstPaid) { summary.skipped++; continue; } // still trialing / never paid

        // Dedupe on the exact invoice (belt) — the partial UNIQUE index on
        // paid_invoice_id is the braces under concurrency.
        const { data: existingInv } = await supabase
          .from("affiliate_conversions")
          .select("id")
          .eq("paid_invoice_id", firstPaid.id)
          .limit(1)
          .maybeSingle();
        if (existingInv) { summary.skipped++; continue; }

        // Resolve the affiliate (platform program only).
        const { data: link } = await supabase
          .from("affiliate_links")
          .select("user_id")
          .eq("code", affiliateCode)
          .maybeSingle();
        if (!link?.user_id) {
          console.warn(`[AFFILIATE-RECONCILER] unknown code ${affiliateCode} on ${sub.id} — skipped`);
          summary.skipped++;
          continue;
        }

        // Resolve the referred user: metadata.user_id, else the guest email.
        let referredUserId: string | null = UUID_RE.test(md.user_id ?? "") ? md.user_id : null;
        if (!referredUserId && md.guest_email) {
          const { data: resolved } = await supabase.rpc("get_user_id_by_email", {
            p_email: md.guest_email,
          });
          if (typeof resolved === "string" && UUID_RE.test(resolved)) referredUserId = resolved;
        }
        if (!referredUserId) {
          console.warn(`[AFFILIATE-RECONCILER] cannot resolve referred user for ${sub.id} — skipped`);
          summary.skipped++;
          continue;
        }

        // Self-referrals are void per the program terms.
        if (referredUserId === link.user_id) {
          console.warn(`[AFFILIATE-RECONCILER] self-referral on ${sub.id} — void, skipped`);
          summary.skipped++;
          continue;
        }

        // SERVER-CONTROLLED commission: 50% of Stripe's verified amount_paid.
        // UPLY marketing cost on platform revenue — creator 95/5 untouched.
        const commissionCents = Math.round(firstPaid.amount_paid * (COMMISSION_PCT / 100));

        const { data: inserted, error: insErr } = await supabase
          .from("affiliate_conversions")
          .insert({
            affiliate_code: affiliateCode,
            referred_user_id: referredUserId,
            referring_user_id: link.user_id,
            conversion_type: "platform_subscription",
            amount: firstPaid.amount_paid / 100,
            commission_amount: commissionCents / 100,
            status: "pending", // admin approves payout, exactly as today
            plan: md.platform_plan || null,
            mrr_cents: firstPaid.amount_paid,
            commission_pct: COMMISSION_PCT,
            stripe_subscription_id: sub.id,
            paid_invoice_id: firstPaid.id,
          })
          .select("id")
          .single();

        if (insErr) {
          // 23505 = another run already recorded this invoice — that's a skip.
          if (insErr.code === "23505") { summary.skipped++; continue; }
          throw insErr;
        }

        summary.created++;

        // Audit trail: pending-commission marker (fire-and-forget, never throws).
        await logMoneyEventSafe(
          () => supabase.rpc("log_money_event", moneyEventRow("affiliate-reconciler", "payout_pending", {
            userId: referredUserId,
            creatorId: link.user_id,
            amountCents: commissionCents,
            referenceId: inserted?.id,
            metadata: {
              affiliate_code: affiliateCode,
              stripe_subscription_id: sub.id,
              paid_invoice_id: firstPaid.id,
              invoice_amount_paid_cents: firstPaid.amount_paid,
              commission_pct: COMMISSION_PCT,
              plan: md.platform_plan || null,
              note: "UPLY marketing cost on platform plan revenue — not creator money; 95/5 split untouched. Pending admin approval.",
            },
          })),
          (m) => console.warn(`[AFFILIATE-RECONCILER] ${m}`),
        );

        console.log(
          `[AFFILIATE-RECONCILER] pending commission ${commissionCents}c (${COMMISSION_PCT}% of ${firstPaid.amount_paid}c) for ${affiliateCode} on ${sub.id}/${firstPaid.id}`,
        );
      } catch (itemErr) {
        summary.errors++;
        console.error(
          `[AFFILIATE-RECONCILER] item failed for ${sub.id}:`,
          itemErr instanceof Error ? itemErr.message : String(itemErr),
        );
      }
    }

    console.log(`[AFFILIATE-RECONCILER] done`, summary);
    return json(summary);
  } catch (error) {
    console.error(
      "[AFFILIATE-RECONCILER] Error:",
      error instanceof Error ? error.message : String(error),
    );
    return json({ error: error instanceof Error ? error.message : "reconciler failed" }, 500);
  }
}));
