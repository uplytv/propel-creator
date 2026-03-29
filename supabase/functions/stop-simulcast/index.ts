import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { live_stream_id, creator_id } = await req.json();
    if (!live_stream_id || !creator_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
    const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: sessions } = await supabase
      .from("stream_simulcast_sessions")
      .select("*")
      .eq("stream_id", live_stream_id)
      .neq("status", "ended");

    const results: Array<{ platform: string; stopped: boolean; error?: string }> = [];

    for (const session of sessions || []) {
      let stopped = false;
      let error: string | undefined;

      if (session.mux_simulcast_id) {
        try {
          const resp = await fetch(
            `https://api.mux.com/video/v1/live-streams/${live_stream_id}/simulcast-targets/${session.mux_simulcast_id}`,
            { method: "DELETE", headers: { Authorization: `Basic ${auth}` } }
          );
          stopped = resp.ok || resp.status === 404;
        } catch (e: any) {
          error = e.message;
        }
      } else {
        stopped = true;
      }

      await supabase
        .from("stream_simulcast_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", session.id);

      results.push({ platform: session.platform, stopped, error });
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
