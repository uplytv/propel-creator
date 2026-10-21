import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function checkRateLimit(supabase: any, userId: string, fnName: string): Promise<boolean> {
  const key = `ratelimit:${userId}:${fnName}`;
  const now = new Date();
  const windowMs = 60_000;
  const maxCalls = 10;

  const { data } = await supabase
    .from("edge_function_rate_limits")
    .select("call_count, window_start")
    .eq("key", key)
    .single();

  if (data) {
    const windowAge = now.getTime() - new Date(data.window_start).getTime();
    if (windowAge < windowMs && data.call_count >= maxCalls) return false;
    if (windowAge >= windowMs) {
      await supabase.from("edge_function_rate_limits").upsert({ key, call_count: 1, window_start: now.toISOString(), updated_at: now.toISOString() });
    } else {
      await supabase.from("edge_function_rate_limits").update({ call_count: data.call_count + 1, updated_at: now.toISOString() }).eq("key", key);
    }
  } else {
    await supabase.from("edge_function_rate_limits").upsert({ key, call_count: 1, window_start: now.toISOString(), updated_at: now.toISOString() });
  }
  return true;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;
    const { user_id: body_user_id, session_id } = await req.json();
    if (body_user_id && body_user_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user_id = auth.user.id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const allowed = await checkRateLimit(supabase, user_id, "stream-heartbeat");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get active simulcast sessions for this user
    const { data: sessions } = await supabase
      .from("stream_simulcast_sessions")
      .select("id, platform, status, stream_id")
      .eq("creator_id", user_id)
      .in("status", ["connecting", "active", "idle"]);

    if (!sessions?.length) {
      return new Response(JSON.stringify({ status: "no_active_sessions" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check each destination's health
    const alerts: Array<{ platform: string; alert_type: string; message: string }> = [];

    for (const session of sessions) {
      // Check if the destination still exists and is enabled
      const { data: dest } = await supabase
        .from("creator_stream_destinations")
        .select("id, is_enabled, stream_key_vault_id, stream_key_encrypted")
        .eq("creator_id", user_id)
        .eq("platform", session.platform)
        .single();

      if (!dest || !dest.is_enabled) {
        alerts.push({
          platform: session.platform,
          alert_type: "connection_lost",
          message: `${session.platform} destination was disabled or removed during stream`,
        });
        continue;
      }

      // Check if credentials are still valid (vault ID or encrypted key exists)
      if (!dest.stream_key_vault_id && !dest.stream_key_encrypted) {
        alerts.push({
          platform: session.platform,
          alert_type: "token_expired",
          message: `${session.platform} stream key is missing — reconnect in Settings`,
        });
      }
    }

    // Insert alerts into multistream_alerts for realtime delivery
    if (alerts.length > 0) {
      const alertRows = alerts.map((a) => ({
        user_id,
        session_id: session_id || null,
        platform: a.platform,
        alert_type: a.alert_type,
        message: a.message,
        resolved: false,
      }));
      await supabase.from("multistream_alerts").insert(alertRows);
    }

    return new Response(JSON.stringify({
      status: "ok",
      sessions_checked: sessions.length,
      alerts_created: alerts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
