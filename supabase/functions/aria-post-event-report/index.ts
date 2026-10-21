import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude, MODEL_PREMIUM } from "../_shared/anthropic.ts";
import { checkEdgeRateLimit } from "../_shared/rateLimit.ts";
import { withCors } from "../_shared/security.ts";

// ARIA Post-Event Intelligence: a narrative recap — attendance curve, gate
// bottlenecks, no-show rate, revenue per tier, and recommendations for next time.
serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    // Rate limit per user (20/hour) — fail-open on infra errors.
    if (!(await checkEdgeRateLimit(supabase, u.user.id, "aria-post-event-report", { maxCalls: 20, windowMs: 60 * 60_000 }))) {
      return err("Rate limit reached. Try again later.", 429);
    }
    const { event_id } = await req.json();
    if (!event_id) return err("event_id required");

    const { data: event } = await supabase.from("events").select("creator_id, title, capacity, ticket_quantity, tickets_sold").eq("id", event_id).maybeSingle();
    if (!event) return err("Event not found", 404);
    if (event.creator_id !== u.user.id) return err("Forbidden", 403);

    const { data: scans } = await supabase.from("scans")
      .select("gate, direction, result, scanned_at").eq("event_id", event_id).order("scanned_at", { ascending: true }).limit(2000);

    // Entries per 15-min bucket + per-gate throughput
    const buckets: Record<string, number> = {};
    const gateCounts: Record<string, number> = {};
    let entries = 0;
    for (const s of scans ?? []) {
      if (s.direction === "in" && s.result === "accepted") {
        entries++;
        const d = new Date(s.scanned_at);
        const key = `${String(d.getUTCHours()).padStart(2, "0")}:${d.getUTCMinutes() < 30 ? "00" : "30"}`;
        buckets[key] = (buckets[key] ?? 0) + 1;
        gateCounts[s.gate ?? "?"] = (gateCounts[s.gate ?? "?"] ?? 0) + 1;
      }
    }
    const sold = event.tickets_sold ?? 0;
    const noShow = sold > 0 ? Math.max(0, sold - entries) : 0;

    const { data: tiers } = await supabase.from("ticket_tiers").select("name, price_cents, quantity_sold").eq("event_id", event_id);

    const system = "You are ARIA, UPLY's post-event analyst. Write a concise, encouraging narrative with concrete, specific recommendations. Respond with ONLY JSON.";
    const user =
      `Event "${event.title}". Tickets sold: ${sold}. Entries (scanned in): ${entries}. No-shows: ${noShow}.\n` +
      `Entries per 30-min (UTC): ${JSON.stringify(buckets)}\nPer-gate entries: ${JSON.stringify(gateCounts)}\n` +
      `Tiers: ${JSON.stringify(tiers ?? [])}\n\n` +
      `Return JSON: {"headline":"...","narrative":"2-3 short paragraphs","bottlenecks":["..."],"recommendations":["..."],"no_show_rate_pct": <number>}`;

    const result = await callClaude(system, user, { json: true, maxTokens: 1600, model: MODEL_PREMIUM });
    return json({ ok: true, report: result, stats: { sold, entries, noShow, gateCounts } });
  } catch (e) {
    return err((e as Error).message ?? "Failed", 500);
  }
}));
