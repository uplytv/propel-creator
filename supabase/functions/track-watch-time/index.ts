// Logs a watch-time heartbeat (every 10s) or final exit event from the player.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { withCors } from "../_shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      content_id, content_type, viewer_id: rawViewerId, session_id,
      watched_seconds, duration_seconds, is_final, category,
    } = body ?? {};
    if (!content_id || !content_type || !duration_seconds) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only trust viewer_id if it matches an authenticated JWT.
    // Anonymous/unauthenticated heartbeats still log, but with viewer_id=null
    // to prevent attribution spoofing / affinity manipulation.
    let viewer_id: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader && rawViewerId) {
      const userClient = createClient(
        SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user && user.id === rawViewerId) viewer_id = user.id;
    }

    const watch_pct = Math.min(100, Math.round((Number(watched_seconds) / Number(duration_seconds)) * 100));
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    await supabase.from("watch_time_events").insert({
      content_id, content_type, viewer_id,
      session_id: session_id || null, watched_seconds, duration_seconds,
      watch_pct, is_final: !!is_final,
    });
    // Bump category affinity on FINAL event for logged-in viewer
    if (is_final && viewer_id && category) {
      await supabase.rpc("bump_viewer_affinity", { p_viewer: viewer_id, p_category: category });
    }
    return new Response(JSON.stringify({ ok: true, watch_pct }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
