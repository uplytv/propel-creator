import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude } from "../_shared/anthropic.ts";

// ARIA Fraud Sentinel: flags anomalous purchase patterns (bulk buys, same buyer)
// and scan anomalies (same ticket at two gates, impossible re-entry timing).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    const { event_id } = await req.json();
    if (!event_id) return err("event_id required");

    const { data: event } = await supabase.from("events").select("creator_id, title").eq("id", event_id).maybeSingle();
    if (!event) return err("Event not found", 404);
    if (event.creator_id !== u.user.id) return err("Forbidden", 403);

    const { data: orders } = await supabase.from("orders")
      .select("buyer_id, total_cents, completed_at, line_items").eq("event_id", event_id).eq("status", "completed").limit(400);

    // Aggregate buyer concentration
    const byBuyer: Record<string, { count: number; total: number }> = {};
    for (const o of orders ?? []) {
      const b = byBuyer[o.buyer_id] ?? { count: 0, total: 0 };
      b.count++; b.total += o.total_cents ?? 0; byBuyer[o.buyer_id] = b;
    }
    const topBuyers = Object.entries(byBuyer).sort((a, b) => b[1].count - a[1].count).slice(0, 10)
      .map(([id, v]) => ({ buyer: id.slice(0, 8), orders: v.count, spentUsd: v.total / 100 }));

    const { data: scans } = await supabase.from("scans")
      .select("ticket_id, gate, direction, result, scanned_at").eq("event_id", event_id).order("scanned_at", { ascending: true }).limit(800);
    // Tickets that hit multiple gates or were rejected as duplicates
    const ticketGates: Record<string, Set<string>> = {};
    let duplicates = 0;
    for (const s of scans ?? []) {
      if (s.result === "rejected_duplicate") duplicates++;
      if (s.ticket_id) { (ticketGates[s.ticket_id] ??= new Set()).add(s.gate ?? "?"); }
    }
    const multiGate = Object.entries(ticketGates).filter(([, g]) => g.size > 1).length;

    const system = "You are ARIA, UPLY's event fraud analyst. Be specific and avoid false alarms. Explain in plain language. Respond with ONLY JSON.";
    const user =
      `Event "${event.title}".\nTop buyers by order count: ${JSON.stringify(topBuyers)}\n` +
      `Scan stats: duplicate_rejections=${duplicates}, tickets_seen_at_multiple_gates=${multiGate}, total_scans=${(scans ?? []).length}\n\n` +
      `Return JSON: {"risk":"low|medium|high","flags":[{"type":"purchase|scan","detail":"...","severity":"low|med|high"}],"note":"one line"}`;

    const result = await callClaude(system, user, { json: true, maxTokens: 1000 });
    return json({ ok: true, report: result, raw_signals: { topBuyers, duplicates, multiGate } });
  } catch (e) {
    return err((e as Error).message ?? "Failed", 500);
  }
});
