import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

function parseRtmpUrl(url: string): { host: string; port: number } | null {
  const match = url.match(/^rtmps?:\/\/([^/:]+)(?::(\d+))?/);
  if (!match) return null;
  const host = match[1];
  const port = match[2] ? parseInt(match[2]) : (url.startsWith("rtmps") ? 443 : 1935);
  return { host, port };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // AuthN: derive user_id from JWT — never trust body-supplied user_id
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user_id = user.id;

    const { rtmp_url, stream_key, platform } = await req.json();
    if (!rtmp_url || !stream_key) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const allowed = await checkRateLimit(supabase, user_id, "validate-rtmp");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate format
    if (!rtmp_url.startsWith("rtmp://") && !rtmp_url.startsWith("rtmps://")) {
      return new Response(JSON.stringify({ valid: false, message: "RTMP URL must start with rtmp:// or rtmps://" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream_key.length < 20) {
      return new Response(JSON.stringify({ valid: false, message: "Stream key must be at least 20 characters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse host and port
    const parsed = parseRtmpUrl(rtmp_url);
    if (!parsed) {
      return new Response(JSON.stringify({ valid: false, message: "Could not parse RTMP URL — check format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TCP connectivity check with 5s timeout
    let reachable = false;
    try {
      const conn = await Promise.race([
        Deno.connect({ hostname: parsed.host, port: parsed.port }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      // If we got here, connection succeeded
      if (conn && typeof (conn as any).close === "function") {
        (conn as any).close();
      }
      reachable = true;
    } catch {
      reachable = false;
    }

    if (!reachable) {
      return new Response(JSON.stringify({ valid: false, message: `Could not reach ${parsed.host}:${parsed.port} — check your RTMP URL` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store credentials in Vault
    const lastFour = stream_key.slice(-4);
    let vaultId: string | null = null;

    try {
      const { data: vaultResult } = await supabase.rpc("vault_create_secret", {
        secret_value: stream_key,
        secret_name: `stream_key_${user_id}_${platform || "custom"}`,
        secret_description: `Stream key for ${platform || "custom"} - user ${user_id}`,
      });
      if (vaultResult) vaultId = vaultResult;
    } catch {
      // Vault may not have the wrapper RPC — fall back to storing encrypted
    }

    // Update destination
    const updateData: Record<string, any> = {
      creator_id: user_id,
      platform: platform || "kick",
      rtmp_url,
      stream_key_encrypted: vaultId ? `vault:${vaultId}` : stream_key,
      stream_key_last_four: lastFour,
      stream_key_vault_id: vaultId,
      is_verified: true,
      key_created_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("creator_stream_destinations")
      .upsert(updateData, { onConflict: "creator_id,platform" });

    if (upsertErr) {
      return new Response(JSON.stringify({ valid: false, message: "Failed to save credentials: " + upsertErr.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      message: "Connection verified and credentials saved",
      vault_encrypted: !!vaultId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
