import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeError(msg: string): string {
  return msg.replace(/[a-zA-Z0-9_-]{16,}/g, "[REDACTED]");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, platform } = await req.json();
    if (!creator_id || !platform) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
    const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit: 60 second cooldown
    const { data: recentTests } = await supabase
      .from("simulcast_test_log")
      .select("tested_at")
      .eq("creator_id", creator_id)
      .eq("platform", platform)
      .order("tested_at", { ascending: false })
      .limit(1);

    if (recentTests?.length) {
      const lastTest = new Date(recentTests[0].tested_at).getTime();
      const secondsAgo = (Date.now() - lastTest) / 1000;
      if (secondsAgo < 60) {
        return new Response(JSON.stringify({
          error: "Please wait 60 seconds between connection tests",
          retry_after: Math.ceil(60 - secondsAgo),
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get destination
    const { data: dest } = await supabase
      .from("creator_stream_destinations")
      .select("*")
      .eq("creator_id", creator_id)
      .eq("platform", platform)
      .single();

    if (!dest) {
      return new Response(JSON.stringify({ error: "No destination configured for this platform" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Decrypt key
    const { data: decrypted } = await supabase.rpc("decrypt_stream_key", { encrypted_key: dest.stream_key_encrypted });
    const streamKey = decrypted || dest.stream_key_encrypted;

    let tempStreamId: string | null = null;
    let simulcastTargetId: string | null = null;
    let testResult: { success: boolean; error?: string } = { success: false };

    try {
      // Create temp Mux live stream
      const createResp = await fetch("https://api.mux.com/video/v1/live-streams", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ latency_mode: "low", test: true, playback_policy: ["public"] }),
      });
      if (!createResp.ok) throw new Error("Failed to create test stream");
      const createJson = await createResp.json();
      tempStreamId = createJson.data.id;

      // Add simulcast target
      const targetResp = await fetch(
        `https://api.mux.com/video/v1/live-streams/${tempStreamId}/simulcast-targets`,
        {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: dest.rtmp_url, stream_key: streamKey }),
        }
      );
      if (!targetResp.ok) {
        const errText = await targetResp.text();
        throw new Error(sanitizeError(errText));
      }
      const targetJson = await targetResp.json();
      simulcastTargetId = targetJson.data.id;

      // Wait 3 seconds
      await new Promise((r) => setTimeout(r, 3000));

      testResult = { success: true };
    } catch (e: any) {
      testResult = { success: false, error: sanitizeError(e.message) };
    } finally {
      // Always clean up
      try {
        if (simulcastTargetId && tempStreamId) {
          await fetch(
            `https://api.mux.com/video/v1/live-streams/${tempStreamId}/simulcast-targets/${simulcastTargetId}`,
            { method: "DELETE", headers: { Authorization: `Basic ${auth}` } }
          );
        }
      } catch { /* ignore cleanup errors */ }
      try {
        if (tempStreamId) {
          await fetch(
            `https://api.mux.com/video/v1/live-streams/${tempStreamId}`,
            { method: "DELETE", headers: { Authorization: `Basic ${auth}` } }
          );
        }
      } catch { /* ignore cleanup errors */ }

      // Log result
      await supabase.from("simulcast_test_log").insert({
        creator_id,
        platform,
        status: testResult.success ? "success" : "failed",
        error_message: testResult.error || null,
      });

      // Update verified status
      if (testResult.success) {
        await supabase
          .from("creator_stream_destinations")
          .update({ is_verified: true })
          .eq("creator_id", creator_id)
          .eq("platform", platform);
      }
    }

    return new Response(JSON.stringify(testResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: sanitizeError(e.message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
