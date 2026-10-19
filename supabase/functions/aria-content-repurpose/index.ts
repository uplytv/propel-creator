import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { checkEdgeRateLimit } from "../_shared/rateLimit.ts";

// ARIA Content Repurposing: turn one long-form piece (video/podcast/post) into a
// full multi-platform package — Shorts, social posts, an email, an X thread, and
// title ideas. Reuses the shared Anthropic caller.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return err("Unauthorized", 401);
  const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user: caller }, error: authError } = await auth.auth.getUser(authorization.slice(7));
  if (authError || !caller) return err("Unauthorized", 401);
  try {
    const { title = "", source = "", content_type = "video" } = await req.json();
    if (!title && !source) return err("Provide a title and/or transcript/notes to repurpose");

    // Verified callers only; block AI spend when the limiter is unavailable.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    if (!(await checkEdgeRateLimit(supabase, caller.id, "aria-content-repurpose", { maxCalls: 10, windowMs: 60 * 60_000, failClosed: true }))) {
      return err("Too many requests in a short time. Please wait a while and try again.", 429);
    }

    const system =
      "You are ARIA, UPLY's content repurposing engine for creators. You turn one piece of " +
      "long-form content into a punchy, on-brand, ready-to-post multi-platform package. " +
      "Respond with ONLY a JSON object — no preamble.";
    const user =
      `Source ${content_type}:\nTitle: ${title}\n\nContent / transcript / notes:\n${source}\n\n` +
      `Return JSON exactly like:\n` +
      `{"shorts":[{"title":"...","hook":"first 3 seconds on screen","clip_idea":"which moment to clip","caption":"..."}],` +
      `"social_posts":[{"platform":"instagram","caption":"...","hashtags":["..."]}],` +
      `"email":{"subject":"...","preview":"...","body":"2-3 short paragraphs"},` +
      `"thread":["post 1","post 2","..."],` +
      `"title_ideas":["..."]}\n` +
      `Generate 3-5 shorts, exactly 4 social_posts (instagram, tiktok, x, linkedin), 1 email, ` +
      `an X thread of 3-5 posts, and 5 title_ideas. Make every line ready to publish.`;

    const result = await callClaude(system, user, { json: true, maxTokens: 2800 });
    return json({ ok: true, package: result });
  } catch (e) {
    return err((e as Error).message ?? "Failed", 500);
  }
});
