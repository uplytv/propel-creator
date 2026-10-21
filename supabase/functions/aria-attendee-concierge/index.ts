import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { checkEdgeRateLimit, requestIp } from "../_shared/rateLimit.ts";
import { jsonResponse, requireUser, serviceClient, strictRateLimit, withCors } from "../_shared/security.ts";

// ARIA Attendee Concierge: answers buyer questions (set times, parking, re-entry,
// age limits) from the event's own data; escalates to the creator when unsure.
serve(withCors(async (req) => {
  // SECURITY: public event-page widget. Signed-in users: 20 / 10 min; anonymous
  // visitors: 5 / 10 min per IP. Rate limit fails CLOSED (AI spend).
  if (req.method !== 'OPTIONS') {
    const hasBearerUser = !!req.headers.get('Authorization') && !(req.headers.get('Authorization') ?? '').endsWith(Deno.env.get('SUPABASE_ANON_KEY') ?? '__none__');
    const auth = hasBearerUser ? await requireUser(req) : null;
    const authedId = auth && 'user' in auth ? auth.user.id : null;
    const ident = authedId ? `user:${authedId}` : `ip:${requestIp(req)}`;
    if (!(await strictRateLimit(serviceClient(), ident, 'aria-attendee-concierge', authedId ? 20 : 5, 10 * 60_000))) {
      return jsonResponse(req, { error: 'Too many requests. Please wait a few minutes and try again.' }, 429);
    }
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const { event_id, question } = await req.json();
    if (!event_id || !question) return err("event_id and question required");

    // Unauthenticated buyer endpoint that spends Anthropic credits — rate limit
    // per IP (10 questions / 10 min), fail-open on infra errors.
    if (!(await checkEdgeRateLimit(supabase, `ip:${requestIp(req)}`, "aria-attendee-concierge", { maxCalls: 10, windowMs: 10 * 60_000 }))) {
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
}));
