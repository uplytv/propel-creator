// get-track-playback
// Service-role resolver: returns a short-TTL signed URL for the full track
// ONLY if the caller has access. Otherwise returns the public preview_url + 403.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNED_URL_TTL_SECONDS = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Auth (optional — anon may request preview for unlocked/preview)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const trackId = body?.trackId || body?.track_id;
    if (!trackId || typeof trackId !== "string") {
      return json({ error: "trackId required" }, 400);
    }

    const { data: track, error: trackErr } = await supabase
      .from("tracks")
      .select(
        "id, creator_id, is_locked, unlock_type, preview_url, audio_mux_playback_id, allow_download",
      )
      .eq("id", trackId)
      .maybeSingle();

    if (trackErr || !track) return json({ error: "Track not found" }, 404);

    // Unlocked → just return the existing public Mux playback URL
    if (!track.is_locked) {
      return json({
        access: "full",
        mux_playback_id: track.audio_mux_playback_id,
        playback_url: track.audio_mux_playback_id
          ? `https://stream.mux.com/${track.audio_mux_playback_id}.m3u8`
          : null,
        allow_download: track.allow_download,
      });
    }

    // Access check (security definer)
    let hasAccess = false;
    if (userId) {
      const { data: ok } = await supabase.rpc("has_track_access", {
        _user_id: userId,
        _track_id: trackId,
      });
      hasAccess = !!ok;
    }

    if (!hasAccess) {
      return json(
        {
          access: "preview",
          preview_url: track.preview_url ?? null,
        },
        403,
      );
    }

    // Resolve private asset
    const { data: priv } = await supabase
      .from("track_private_assets")
      .select("mux_playback_id, storage_bucket, storage_path")
      .eq("track_id", trackId)
      .maybeSingle();

    // Storage path → signed URL
    if (priv?.storage_path && priv.storage_bucket) {
      const { data: signed, error: signErr } = await supabase
        .storage
        .from(priv.storage_bucket)
        .createSignedUrl(priv.storage_path, SIGNED_URL_TTL_SECONDS);
      if (signErr) return json({ error: signErr.message }, 500);
      return json({
        access: "full",
        playback_url: signed?.signedUrl,
        expires_in: SIGNED_URL_TTL_SECONDS,
        allow_download: track.allow_download,
      });
    }

    // Mux fallback (assumes signed playback policy on private Mux asset)
    const muxPlaybackId = priv?.mux_playback_id || track.audio_mux_playback_id;
    if (muxPlaybackId) {
      return json({
        access: "full",
        mux_playback_id: muxPlaybackId,
        playback_url: `https://stream.mux.com/${muxPlaybackId}.m3u8`,
        allow_download: track.allow_download,
      });
    }

    return json({ error: "No playable source" }, 500);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
