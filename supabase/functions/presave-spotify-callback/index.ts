// Spotify OAuth callback for presave_campaigns. Persists tokens + consents.
// Does NOT call /me/tracks at signup; fulfillment happens via presave-release-day cron.
// If campaign is already 'released', performs save immediately.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";

function parseSpotifyTrackId(uri: string | null): string | null {
  if (!uri) return null;
  const m = uri.match(/spotify:track:([a-zA-Z0-9]+)/) ?? uri.match(/\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
    const { code, redirect_uri, campaign_slug, campaign_id, fan_email, scopes } = await req.json();

    if (!code || !redirect_uri || (!campaign_slug && !campaign_id)) {
      return new Response(JSON.stringify({ error: "code, redirect_uri, campaign_slug or campaign_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri }),
    });
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: "Spotify token exchange failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { access_token, refresh_token } = await tokenRes.json();

    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};
    const finalEmail = fan_email || profile.email;
    if (!finalEmail) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const q = supabase.from("presave_campaigns").select("*");
    const lookup = campaign_id ? q.eq("id", campaign_id) : q.eq("campaign_url_slug", campaign_slug);
    const { data: campaign } = await lookup.maybeSingle();

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grantedScopes: string[] = typeof scopes === "string" ? scopes.split(/\s+/) : Array.isArray(scopes) ? scopes : [];
    const consentSave = grantedScopes.includes("user-library-modify");
    const consentFollow = grantedScopes.includes("user-follow-modify");

    // If campaign already released and distribution confirmed, fulfill now.
    let immediateSaved = false;
    if (campaign.status === "released" && campaign.distribution_confirmed_spotify) {
      const trackId = parseSpotifyTrackId(campaign.spotify_track_uri);
      if (trackId && consentSave) {
        const r = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${access_token}` },
        });
        immediateSaved = r.ok;
      }
    }

    await supabase
      .from("presave_subscribers")
      .upsert(
        {
          campaign_id: campaign.id,
          email: finalEmail,
          platform: "spotify",
          spotify_access_token: access_token,
          spotify_refresh_token: refresh_token,
          spotify_user_id: profile.id ?? null,
          consent_save_track: consentSave,
          consent_follow_artist: consentFollow,
          fulfilled: immediateSaved,
          fulfilled_at: immediateSaved ? new Date().toISOString() : null,
        },
        { onConflict: "campaign_id,email,platform" }
      );

    return new Response(JSON.stringify({ ok: true, immediate: immediateSaved }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
