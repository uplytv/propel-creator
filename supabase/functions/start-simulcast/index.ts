import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeError(msg: string): string {
  // Remove anything that looks like a stream key
  return msg.replace(/[a-zA-Z0-9_-]{16,}/g, "[REDACTED]");
}

async function addSimulcastTarget(
  liveStreamId: string,
  rtmpUrl: string,
  streamKey: string,
  muxTokenId: string,
  muxTokenSecret: string
): Promise<{ id: string; status: string } | null> {
  const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
  const resp = await fetch(
    `https://api.mux.com/video/v1/live-streams/${liveStreamId}/simulcast-targets`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: rtmpUrl, stream_key: streamKey }),
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(sanitizeError(err));
  }
  const json = await resp.json();
  return { id: json.data.id, status: json.data.status || "idle" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { live_stream_id, creator_id, platform: singlePlatform } = await req.json();
    if (!live_stream_id || !creator_id) {
      return new Response(JSON.stringify({ error: "Missing live_stream_id or creator_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get enabled destinations
    let query = supabase
      .from("creator_stream_destinations")
      .select("*")
      .eq("creator_id", creator_id)
      .eq("is_enabled", true);
    
    if (singlePlatform) {
      query = query.eq("platform", singlePlatform);
    }

    const { data: destinations, error: destErr } = await query;
    if (destErr) throw destErr;
    if (!destinations?.length) {
      return new Response(JSON.stringify({ results: [], message: "No enabled destinations" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ platform: string; success: boolean; error?: string }> = [];

    for (const dest of destinations) {
      // Decrypt stream key server-side via pgcrypto
      const { data: decrypted, error: decryptErr } = await supabase.rpc("decrypt_stream_key", { encrypted_key: dest.stream_key_encrypted });
      
      let streamKey: string;
      if (decryptErr || !decrypted) {
        // Fallback: the key might be stored as-is (for initial implementation without pgcrypto)
        streamKey = dest.stream_key_encrypted;
      } else {
        streamKey = decrypted;
      }

      let success = false;
      let errorMsg: string | null = null;
      let simulcastId: string | null = null;

      try {
        const result = await addSimulcastTarget(live_stream_id, dest.rtmp_url, streamKey, muxTokenId, muxTokenSecret);
        if (result) {
          simulcastId = result.id;
          success = true;
        }
      } catch (e: any) {
        errorMsg = sanitizeError(e.message || "Unknown error");
      }

      // If failed, retry once after a delay
      if (!success) {
        await new Promise((r) => setTimeout(r, 15000));
        try {
          const result = await addSimulcastTarget(live_stream_id, dest.rtmp_url, streamKey, muxTokenId, muxTokenSecret);
          if (result) {
            simulcastId = result.id;
            success = true;
            errorMsg = null;
          }
        } catch (e: any) {
          errorMsg = sanitizeError(e.message || "Retry failed");
        }
      }

      // Insert session record
      await supabase.from("stream_simulcast_sessions").insert({
        stream_id: live_stream_id,
        creator_id,
        platform: dest.platform,
        mux_simulcast_id: simulcastId,
        rtmp_url: dest.rtmp_url,
        status: success ? "connecting" : "failed",
        retry_count: success ? 0 : 1,
        started_at: success ? new Date().toISOString() : null,
        error_message: errorMsg,
      });

      // Update last_used_at
      if (success) {
        await supabase
          .from("creator_stream_destinations")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", dest.id);
      }

      results.push({ platform: dest.platform, success, error: errorMsg || undefined });
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: sanitizeError(e.message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
