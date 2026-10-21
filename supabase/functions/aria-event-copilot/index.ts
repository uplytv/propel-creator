import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { requireUser, strictRateLimit, withCors } from "../_shared/security.ts";

// ARIA Event Copilot: turn a plain-language event idea into a full draft —
// page copy, suggested ticket tiers + pricing, announcement email, social copy.
serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // SECURITY: authenticated callers only; rate limit fails CLOSED (costs money).
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;
    const { description, event_type = "concert", capacity, city } = await req.json();
    if (!description) return err("description required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    if (!(await strictRateLimit(supabase, `user:${auth.user.id}`, "aria-event-copilot", 10, 10 * 60_000))) {
      return err("Too many drafts in a short time. Please wait a few minutes and try again.", 429);
    }

    const system =
      "You are ARIA, UPLY's event marketing copilot for creators. You write punchy, " +
      "on-brand copy and price tickets realistically. Always respond with ONLY a JSON object.";
    const user =
      `Event idea: ${description}\nType: ${event_type}\n` +
      (capacity ? `Capacity: ${capacity}\n` : "") +
      (city ? `City: ${city}\n` : "") +
      `\nReturn JSON exactly like:\n` +
      `{"title": "...", "description": "2-3 short marketing paragraphs",` +
      `"tiers": [{"name":"General Admission","price":25,"perks":["..."]}],` +
      `"announcement_email": {"subject":"...","body":"..."},` +
      `"social_caption": "...", "hashtags": ["..."]}\n` +
      `Suggest 2-4 tiers with sensible escalating prices for the type/capacity. Prices in whole dollars.`;

    const result = await callClaude(system, user, { json: true, maxTokens: 1800 });
    return json({ ok: true, draft: result });
  } catch (e) {
    return err((e as Error).message ?? "Failed", 500);
  }
}));
