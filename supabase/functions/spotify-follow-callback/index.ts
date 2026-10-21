// Spotify "follow to unlock" callback.
// Exchanges OAuth code → access token → follows the configured artist → records the unlock.
// Public endpoint (verify_jwt = false) so anonymous fans can complete the flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!SPOTIFY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "SPOTIFY_CLIENT_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { code, redirect_uri, link_slug, fan_email } = body as {
      code?: string;
      redirect_uri?: string;
      link_slug?: string;
      fan_email?: string;
    };

    if (!code || !redirect_uri || !link_slug) {
      return new Response(
        JSON.stringify({ error: "code, redirect_uri, and link_slug are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Token exchange
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return new Response(
        JSON.stringify({ error: `Spotify token exchange failed: ${txt}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { access_token } = await tokenRes.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: link } = await supabase
      .from("smart_links")
      .select("id, slug, title, cover_image_url, unlock_spotify_artist_id, unlock_reward_url, unlock_reward_label, unlock_reward_type")
      .eq("slug", link_slug)
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Follow the artist (best-effort)
    let followed = false;
    if (link.unlock_spotify_artist_id) {
      const followRes = await fetch(
        `https://api.spotify.com/v1/me/following?type=artist&ids=${encodeURIComponent(link.unlock_spotify_artist_id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        },
      );
      followed = followRes.ok || followRes.status === 204;
    }

    // Pull profile (best-effort) for email/id capture
    let spotifyUserId: string | null = null;
    let spotifyEmail: string | null = null;
    try {
      const profileRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        spotifyUserId = profile.id || null;
        spotifyEmail = profile.email || null;
      }
    } catch { /* ignore */ }

    const finalEmail = fan_email || spotifyEmail || null;

    await supabase.from("smart_link_unlocks").insert({
      link_id: link.id,
      fan_email: finalEmail,
      spotify_user_id: spotifyUserId,
      unlock_type: "spotify_follow",
    });

    if (finalEmail) {
      await supabase
        .from("smart_link_email_captures")
        .insert({ link_id: link.id, email: finalEmail, source: "unlock_spotify_follow" })
        .then(() => {}, () => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        followed,
        title: link.title,
        cover_image_url: link.cover_image_url,
        reward_url: link.unlock_reward_url,
        reward_label: link.unlock_reward_label,
        reward_type: link.unlock_reward_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("spotify-follow-callback error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}));
