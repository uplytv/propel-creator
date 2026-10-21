import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  extractPaymentIntentId,
  moneyEventRow,
  logMoneyEventSafe,
} from "../_shared/stripeWebhookLogic.ts";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// One-off repair for BUG 1 (live_purchases keyed by checkout SESSION id).
// Rows completed BEFORE the webhook fix carry 'cs_...' in
// stripe_payment_intent_id, so refund/dispute paths that look up by the real
// payment intent can't find them. This function resolves each session via
// Stripe and stores the real PI.
//
// * Admin-only: verifies the caller JWT + has_role(admin) via the service
//   client (config.toml verify_jwt=false — the function does its own auth,
//   like its siblings).
// * Paged: up to BATCH_LIMIT rows per invocation; the response reports how
//   many matching rows remain so the caller re-invokes until remaining=0.
// * Idempotent: updated rows no longer match the "cs_%" filter, and the
//   UPDATE is guarded on the old value so concurrent runs can't clobber.
// * Each successful update is logged to money_events (event_type
//   'backfill_pi', amount null) via the never-throw log_money_event RPC.
const BATCH_LIMIT = 50;

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // AUTH: admin only — this rewrites payment keys on purchase rows.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonResponse({ error: "Server misconfigured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: rows, error: fetchErr } = await supabase
      .from("live_purchases")
      .select("id, stripe_payment_intent_id")
      .like("stripe_payment_intent_id", "cs_%")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);
    if (fetchErr) return jsonResponse({ error: fetchErr.message }, 500);

    const errors: Array<{ id: string; error: string }> = [];
    let updated = 0;

    for (const row of rows ?? []) {
      const sessionId = row.stripe_payment_intent_id as string;
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const pi = extractPaymentIntentId(session.payment_intent);
        if (!pi || pi === sessionId) {
          errors.push({ id: row.id, error: "session has no payment_intent (skipped)" });
          continue;
        }

        // Guarded on the old value: idempotent + safe under concurrent runs.
        const { data: changed, error: updErr } = await supabase
          .from("live_purchases")
          .update({ stripe_payment_intent_id: pi })
          .eq("id", row.id)
          .eq("stripe_payment_intent_id", sessionId)
          .select("id")
          .maybeSingle();
        if (updErr) {
          errors.push({ id: row.id, error: updErr.message });
          continue;
        }
        if (!changed) continue; // another run already fixed it — nothing to report

        updated++;
        // Audit trail (fire-and-forget; logMoneyEventSafe can never throw)
        await logMoneyEventSafe(
          () => supabase.rpc("log_money_event", moneyEventRow("backfill-live-purchase-pis", "backfill_pi", {
            paymentIntentId: pi, referenceId: row.id,
            metadata: { previous_value: sessionId },
          })),
          (m) => console.warn(`[BACKFILL-LIVE-PURCHASE-PIS] ${m}`),
        );
      } catch (e: any) {
        errors.push({ id: row.id, error: e?.message ?? String(e) });
      }
    }

    // Continuation signal: rows still matching the filter (includes rows that
    // were skipped/errored this run — errors[] identifies those).
    const { count } = await supabase
      .from("live_purchases")
      .select("id", { count: "exact", head: true })
      .like("stripe_payment_intent_id", "cs_%");

    return jsonResponse({
      processed: rows?.length ?? 0,
      updated,
      remaining: count ?? 0,
      errors,
    });
  } catch (error: any) {
    console.error("[BACKFILL-LIVE-PURCHASE-PIS] Error:", error?.message ?? error);
    return jsonResponse({ error: error?.message ?? "Failed" }, 500);
  }
}));
