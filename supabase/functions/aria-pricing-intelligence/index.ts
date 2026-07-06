import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude, MODEL_PREMIUM } from "../_shared/anthropic.ts";
import { checkEdgeRateLimit } from "../_shared/rateLimit.ts";

// ARIA Pricing Intelligence: analyzes sales velocity vs time-to-event and
// recommends tier releases / price moves. RECOMMENDATIONS ONLY — never reprices.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    // Rate limit per user (20/hour) — fail-open on infra errors.
    if (!(await checkEdgeRateLimit(supabase, u.user.id, "aria-pricing-intelligence", { maxCalls: 20, windowMs: 60 * 60_000 }))) {
      return err("Rate limit reached. Try again later.", 429);
    }
    const { event_id } = await req.json();
    if (!event_id) return err("event_id required");

    const { data: event } = await supabase.from("events").select("id, title, creator_id, starts_at, capacity, ticket_quantity, tickets_sold").eq("id", event_id).maybeSingle();
    if (!event) return err("Event not found", 404);
    if (event.creator_id !== u.user.id) return err("Forbidden", 403);

    const { data: tiers } = await supabase.from("ticket_tiers")
      .select("name, price_cents, quantity_total, quantity_sold, sales_start_at, sales_end_at, is_hidden").eq("event_id", event_id);
    const { data: recentOrders } = await supabase.from("orders")
      .select("total_cents, completed_at").eq("event_id", event_id).eq("status", "completed").order("completed_at", { ascending: false }).limit(100);

    const daysToEvent = event.starts_at ? Math.round((new Date(event.starts_at).getTime() - Date.now()) / 86400000) : null;
    const system = "You are ARIA, UPLY's ticket pricing analyst. Give concise, actionable, conservative recommendations. The creator always approves; never auto-reprice. Respond with ONLY JSON.";
    const user =
      `Event "${event.title}". Days to event: ${daysToEvent}. Capacity: ${event.capacity ?? event.ticket_quantity ?? "?"}.\n` +
      `Tiers: ${JSON.stringify(tiers ?? [])}\n` +
      `Recent completed orders (newest first): ${JSON.stringify((recentOrders ?? []).slice(0, 40))}\n\n` +
      `Return JSON: {"summary":"one line","velocity":"slow|steady|hot","recommendations":[{"action":"...","why":"...","confidence":"low|med|high"}]}`;

    const result = await callClaude(system, user, { json: true, maxTokens: 1200, model: MODEL_PREMIUM });
    return json({ ok: true, analysis: result });
  } catch (e) {
    return err((e as Error).message ?? "Failed", 500);
  }
});
