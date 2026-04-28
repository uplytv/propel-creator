// Spotify presave OAuth callback handler
// Exchanges Spotify auth code for tokens, optionally saves track immediately if released,
// otherwise stores tokens for the release-day cron to fire saves later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

interface ExchangeRequest {
  code: string;
  redirect_uri: string;
  link_slug: string;
  fan_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code, redirect_uri, link_slug, fan_email } = (await req.json()) as ExchangeRequest;

    if (!code || !redirect_uri || !link_slug) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[presave-callback] Spotify token exchange failed:", errText);
      return new Response(
        JSON.stringify({ error: "Spotify token exchange failed", details: errText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // 2. Fetch Spotify user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await profileRes.json();

    // 3. Look up smart link
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link, error: linkErr } = await supabase
      .from("smart_links")
      .select("*")
      .eq("slug", link_slug)
      .maybeSingle();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Smart link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platforms = (link.platforms || {}) as Record<string, string>;
    const spotifyUrl: string | undefined = platforms.spotify;

    // Extract Spotify track or album ID from URL if present
    let trackId: string | null = null;
    let albumId: string | null = null;
    if (spotifyUrl) {
      const trackMatch = spotifyUrl.match(/\/track\/([a-zA-Z0-9]+)/);
      const albumMatch = spotifyUrl.match(/\/album\/([a-zA-Z0-9]+)/);
      if (trackMatch) trackId = trackMatch[1];
      if (albumMatch) albumId = albumMatch[1];
    }

    // 4. Decide whether to save immediately or queue for release day
    const releaseDate = link.release_date ? new Date(link.release_date) : null;
    const isReleased = !releaseDate || releaseDate <= new Date();

    let convertedAt: string | null = null;
    if (isReleased && (trackId || albumId)) {
      // Save immediately
      const savePath = trackId
        ? `https://api.spotify.com/v1/me/tracks?ids=${trackId}`
        : `https://api.spotify.com/v1/me/albums?ids=${albumId}`;
      const saveRes = await fetch(savePath, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (saveRes.ok) {
        convertedAt = new Date().toISOString();
      } else {
        console.error("[presave-callback] Spotify save failed:", await saveRes.text());
      }
    }

    // 5. Persist presave row
    const { error: insertErr } = await supabase.from("smart_link_presaves").insert({
      link_id: link.id,
      fan_email: fan_email || profile.email || null,
      fan_name: profile.display_name || null,
      provider: "spotify",
      spotify_user_id: profile.id,
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token,
      spotify_token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      spotify_track_id: trackId,
      spotify_album_id: albumId,
      converted_at: convertedAt,
    });

    if (insertErr) {
      console.error("[presave-callback] insert failed:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to record presave" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Optional: capture email
    if (fan_email || profile.email) {
      await supabase
        .from("smart_link_email_captures")
        .insert({
          link_id: link.id,
          email: fan_email || profile.email,
          source: "presave_spotify",
        })
        .then(() => {}, () => {}); // ignore unique conflict
    }

    return new Response(
      JSON.stringify({
        success: true,
        converted: !!convertedAt,
        title: link.title,
        artist: link.artist,
        cover_image_url: link.cover_image_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[presave-callback] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
