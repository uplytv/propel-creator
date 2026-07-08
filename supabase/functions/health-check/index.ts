// health-check — unauthenticated liveness endpoint for uptime monitors
// (Phase 4: launch-day monitoring).
//
// verify_jwt = false (config.toml): uptime monitors (UptimeRobot, BetterStack,
// plain curl crons) cannot mint Supabase JWTs, so the endpoint must answer
// without auth. In exchange it returns NO sensitive data — only per-check
// ok/fail booleans, latencies, and a queue depth integer. No keys, no
// balances, no asset data, no error payloads.
//
// WHY ALWAYS HTTP 200: most uptime monitors treat any non-2xx as "the
// endpoint is down" and cannot distinguish "the health checker itself
// crashed" from "one dependency is slow". Returning 200 with a machine-
// readable body lets monitors alert on the keyword `"status":"degraded"`
// (body match) while HTTP-level failures (non-200 / timeout) still mean the
// edge runtime itself is unreachable — two distinct, meaningful signals.
//
// Distinct from health-check-cron, which is the scheduled recorder that
// persists rows into public.health_checks; this endpoint is the cheap
// synchronous probe for external monitors and the admin dashboard card.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CHECK_TIMEOUT_MS = 3000;

interface CheckResult {
  ok: boolean;
  ms: number;
  depth?: number;
}

/** Run a probe with an individual timeout; a failed/timed-out probe can only
 * mark itself not-ok — it can never throw out of the handler. */
async function timed(
  probe: (signal: AbortSignal) => Promise<boolean>,
): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const ok = await probe(AbortSignal.timeout(CHECK_TIMEOUT_MS));
    return { ok, ms: Date.now() - t0 };
  } catch (_e) {
    return { ok: false, ms: Date.now() - t0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // (a) Supabase DB reachable — trivial `select 1` behind the health_ping RPC
  // (service-role-only grant), via the service client.
  const dbCheck = timed(async (signal) => {
    const { data, error } = await supabase.rpc("health_ping").abortSignal(signal);
    return !error && data === 1;
  });

  // (b) Stripe reachable — GET /v1/balance is the raw-HTTP equivalent of
  // stripe.balance.retrieve(): read-only, side-effect-free, cheap.
  const stripeCheck = timed(async (signal) => {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return false;
    const r = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      signal,
    });
    r.body?.cancel();
    return r.ok;
  });

  // (c) Mux reachable — read-only single-asset list with basic auth.
  const muxCheck = timed(async (signal) => {
    const id = Deno.env.get("MUX_TOKEN_ID");
    const secret = Deno.env.get("MUX_TOKEN_SECRET");
    if (!id || !secret) return false;
    const r = await fetch("https://api.mux.com/video/v1/assets?limit=1", {
      headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}` },
      signal,
    });
    r.body?.cancel();
    return r.ok;
  });

  // (d) Email queue depth — pgmq.metrics via the email_queue_depth RPC
  // (O(1) stats read, never-throw on the SQL side too).
  const emailQueueCheck = (async (): Promise<CheckResult> => {
    const t0 = Date.now();
    try {
      const { data, error } = await supabase
        .rpc("email_queue_depth")
        .abortSignal(AbortSignal.timeout(CHECK_TIMEOUT_MS));
      if (error) return { ok: false, ms: Date.now() - t0 };
      return { ok: true, ms: Date.now() - t0, depth: Number(data ?? 0) };
    } catch (_e) {
      return { ok: false, ms: Date.now() - t0 };
    }
  })();

  const [db, stripe, mux, email_queue] = await Promise.all([
    dbCheck,
    stripeCheck,
    muxCheck,
    emailQueueCheck,
  ]);

  const checks = { db, stripe, mux, email_queue };
  const status: "ok" | "degraded" =
    db.ok && stripe.ok && mux.ok && email_queue.ok ? "ok" : "degraded";

  // Structured log — statuses and latencies only, never payloads or secrets.
  console.log(JSON.stringify({
    fn: "health-check",
    status,
    db: db.ok, db_ms: db.ms,
    stripe: stripe.ok, stripe_ms: stripe.ms,
    mux: mux.ok, mux_ms: mux.ms,
    email_queue: email_queue.ok, email_queue_depth: email_queue.depth ?? null,
  }));

  const version = Deno.env.get("GIT_SHA") ?? Deno.env.get("COMMIT_SHA");
  const body: Record<string, unknown> = { status, checks };
  if (version) body.version = version;

  // Always 200 — monitors read the body (see header comment).
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
