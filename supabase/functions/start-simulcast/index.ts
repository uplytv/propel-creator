import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeError(msg: string): string {
  return msg.replace(/[a-zA-Z0-9_-]{16,}/g, "[REDACTED]");
}

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

async function decryptStreamKey(supabase: any, dest: any): Promise<string> {
  // Try Vault first
  if (dest.stream_key_vault_id) {
    try {
      const { data: vaultRows } = await supabase
        .from("vault.decrypted_secrets")
        .select("decrypted_secret")
        .eq("id", dest.stream_key_vault_id)
        .single();
      if (vaultRows?.decrypted_secret) return vaultRows.decrypted_secret;
    } catch { /* fall through */ }
  }

  // Check if stream_key_encrypted has vault prefix
  if (dest.stream_key_encrypted?.startsWith("vault:")) {
    const vaultId = dest.stream_key_encrypted.replace("vault:", "");
    try {
      const { data: vaultRows } = await supabase
        .from("vault.decrypted_secrets")
        .select("decrypted_secret")
        .eq("id", vaultId)
        .single();
      if (vaultRows?.decrypted_secret) return vaultRows.decrypted_secret;
    } catch { /* fall through */ }
  }

  // Try pgcrypto decrypt
  const { data: decrypted } = await supabase.rpc("decrypt_stream_key", { encrypted_key: dest.stream_key_encrypted });
  if (decrypted) return decrypted;

  // Fallback: raw value
  return dest.stream_key_encrypted;
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

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { live_stream_id, creator_id: body_creator_id, platform: singlePlatform } = await req.json();
    if (!live_stream_id) {
      return new Response(JSON.stringify({ error: "Missing live_stream_id or creator_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    // SECURITY: caller must be the authenticated owner of this stream.
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;
    const creator_id = auth.user.id;
    if (body_creator_id && body_creator_id !== creator_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
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

    // Rate limit
    const allowed = await checkRateLimit(supabase, creator_id, "start-simulcast");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      const streamKey = await decryptStreamKey(supabase, dest);

      let success = false;
      let errorMsg: string | null = null;
      let simulcastId: string | null = null;

      try {
        const result = await addSimulcastTarget(muxLiveStreamId, dest.rtmp_url, streamKey, muxTokenId, muxTokenSecret);
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
          const result = await addSimulcastTarget(muxLiveStreamId, dest.rtmp_url, streamKey, muxTokenId, muxTokenSecret);
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

      // If failed, create an alert
      if (!success) {
        await supabase.from("multistream_alerts").insert({
          user_id: creator_id,
          platform: dest.platform,
          alert_type: "connection_lost",
          message: `Failed to connect to ${dest.platform}: ${errorMsg || "Unknown error"}`,
        });
      }

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
}));
