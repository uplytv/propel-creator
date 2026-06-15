import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json } from "../_shared/eventsCors.ts";

const SERVICES = [
  { name: "stripe", url: "https://api.stripe.com/v1/charges?limit=1", env: "STRIPE_SECRET_KEY", auth: "bearer" },
  { name: "mux", url: "https://api.mux.com/video/v1/live-streams?limit=1", env: "MUX_TOKEN_ID", auth: "basic" },
  { name: "resend", url: "https://api.resend.com/domains", env: "RESEND_API_KEY", auth: "bearer" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const results: any[] = [];
  for (const svc of SERVICES) {
    const t0 = Date.now();
    try {
      const key = Deno.env.get(svc.env);
      if (!key) {
        results.push({ service: svc.name, status: "down", error_message: "key missing" });
        continue;
      }
      const headers: Record<string, string> = {};
      if (svc.auth === "bearer") headers["Authorization"] = `Bearer ${key}`;
      if (svc.auth === "basic") {
        const sec = Deno.env.get("MUX_TOKEN_SECRET") ?? "";
        headers["Authorization"] = `Basic ${btoa(`${key}:${sec}`)}`;
      }
      const r = await fetch(svc.url, { headers, signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - t0;
      results.push({
        service: svc.name,
        status: r.ok ? "healthy" : r.status >= 500 ? "down" : "degraded",
        latency_ms: latency,
        error_message: r.ok ? null : `HTTP ${r.status}`,
      });
    } catch (e) {
      results.push({
        service: svc.name,
        status: "down",
        latency_ms: Date.now() - t0,
        error_message: (e as Error).message,
      });
    }
  }
  // Supabase self-check
  const t0 = Date.now();
  try {
    const { error } = await supabase.from("feature_flags").select("key").limit(1);
    results.push({
      service: "supabase",
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - t0,
      error_message: error?.message ?? null,
    });
  } catch (e) {
    results.push({ service: "supabase", status: "down", error_message: (e as Error).message });
  }

  await supabase.from("health_checks").insert(results);
  return json({ ok: true, results });
});
