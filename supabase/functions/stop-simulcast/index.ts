import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { live_stream_id, creator_id: body_creator_id } = await req.json();
    if (!live_stream_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    // SECURITY: caller must be the authenticated owner of this stream.
    const caller = await requireUser(req);
    if ("response" in caller) return caller.response;
    const creator_id = caller.user.id;
    if (body_creator_id && body_creator_id !== creator_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
    const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(live_stream_id))) {
      return new Response(JSON.stringify({ error: "Invalid live_stream_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ownerFilter = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(live_stream_id))
      ? `id.eq.${live_stream_id},mux_stream_id.eq.${live_stream_id}`
      : `mux_stream_id.eq.${live_stream_id}`;
    const { data: ownedStream } = await supabase
      .from("mux_live_streams")
      .select("id, mux_stream_id, user_id")
      .or(ownerFilter)
      .eq("user_id", creator_id)
      .maybeSingle();
    if (!ownedStream?.mux_stream_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const muxLiveStreamId: string = ownedStream.mux_stream_id;

    const { data: sessions } = await supabase
      .from("stream_simulcast_sessions")
      .select("*")
      .eq("stream_id", live_stream_id)
      .eq("creator_id", creator_id)
      .neq("status", "ended");

    const results: Array<{ platform: string; stopped: boolean; error?: string }> = [];

    for (const session of sessions || []) {
      let stopped = false;
      let error: string | undefined;

      if (session.mux_simulcast_id) {
        try {
          const resp = await fetch(
            `https://api.mux.com/video/v1/live-streams/${muxLiveStreamId}/simulcast-targets/${session.mux_simulcast_id}`,
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
}));
