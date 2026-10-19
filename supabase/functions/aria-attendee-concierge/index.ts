import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { checkEdgeRateLimit } from "../_shared/rateLimit.ts";

// ARIA Attendee Concierge: answers buyer questions (set times, parking, re-entry,
// age limits) from the event's own data; escalates to the creator when unsure.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return err("Unauthorized", 401);
  const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await auth.auth.getUser(authorization.slice(7));
  if (authError || !user) return err("Unauthorized", 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const { event_id, question } = await req.json();
    if (!event_id || !question) return err("event_id and question required");

    // Verified callers only; block AI spend when the limiter is unavailable.
    if (!(await checkEdgeRateLimit(supabase, user.id, "aria-attendee-concierge", { maxCalls: 10, windowMs: 10 * 60_000, failClosed: true }))) {
      return err("Too many questions in a short time. Please wait a few minutes and try again.", 429);
    }

    const { data: event } = await supabase.from("events")
      .select("title, description, starts_at, ends_at, doors_open_at, timezone, venue_name, location_name, location_address, location_city, lineup, refund_policy, resale_allowed, status, visibility")
      .eq("id", event_id).maybeSingle();
    if (!event || (event.status !== "published")) return err("Event not available", 404);

    const { data: tiers } = await supabase.from("ticket_tiers").select("name, price_cents, perks").eq("event_id", event_id).eq("is_hidden", false);

    const system =
      "You are ARIA, a friendly concierge for a live event. Answer ONLY from the provided event data. " +
      "If the data does not contain the answer, say you'll check with the organizer and set needs_human=true. Keep it short. Respond with ONLY JSON.";
    const user =
      `EVENT DATA:\n${JSON.stringify({ ...event, tiers: tiers ?? [] })}\n\nATTENDEE QUESTION: ${question}\n\n` +
      `Return JSON: {"answer":"...","needs_human": true|false}`;

    const result = await callClaude(system, user, { json: true, maxTokens: 600 });
    return json({ ok: true, ...result });
  } catch (e) {
    return err((e as Error).message ?? "Failed", 500);
  }
});
