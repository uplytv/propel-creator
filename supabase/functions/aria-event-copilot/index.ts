import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude } from "../_shared/anthropic.ts";

// ARIA Event Copilot: turn a plain-language event idea into a full draft —
// page copy, suggested ticket tiers + pricing, announcement email, social copy.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { description, event_type = "concert", capacity, city } = await req.json();
    if (!description) return err("description required");

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
});
