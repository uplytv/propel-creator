// Release-day fulfillment for presave_campaigns.
// Cron: every 5 minutes. Finds campaigns whose release_at <= now() and status='active',
// fulfills subscribers per platform, sends "it's live" emails, and flips status to 'released'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APPLE_DEV_TOKEN = Deno.env.get("APPLE_MUSIC_DEVELOPER_TOKEN");

function parseSpotifyTrackId(uri: string | null): string | null {
  if (!uri) return null;
  const m = uri.match(/spotify:track:([a-zA-Z0-9]+)/) ?? uri.match(/\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  if (!SPOTIFY_CLIENT_SECRET) return null;
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.access_token ?? null;
  } catch {
    return null;
  }
}

async function spotifySaveTrack(token: string, trackId: string): Promise<boolean> {
  const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  return res.ok;
}

async function spotifyFollowArtistFromTrack(token: string, trackId: string): Promise<boolean> {
  try {
    const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!trackRes.ok) return false;
    const t = await trackRes.json();
    const artistId = t?.artists?.[0]?.id;
    if (!artistId) return false;
    const f = await fetch(`https://api.spotify.com/v1/me/following?type=artist&ids=${artistId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    return f.ok || f.status === 204;
  } catch {
    return false;
  }
}

async function appleAddAlbum(userToken: string, albumId: string): Promise<boolean> {
  if (!APPLE_DEV_TOKEN) return false;
  const r = await fetch(`https://api.music.apple.com/v1/me/library?ids[albums]=${albumId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${APPLE_DEV_TOKEN}`, "Music-User-Token": userToken },
  });
  return r.ok || r.status === 202;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "UPLY <notify@notify.uply.tv>", to, subject, html }),
    });
  } catch (e) {
    console.error("[release-day] email failed", e);
  }
}

function liveEmailHtml(opts: {
  trackTitle: string;
  artistName: string;
  coverUrl?: string | null;
  spotifySaved: boolean;
  links: { platform: string; url: string }[];
}) {
  const cover = opts.coverUrl
    ? `<img src="${opts.coverUrl}" alt="" width="280" height="280" style="display:block;margin:0 auto 20px;border-radius:16px;max-width:280px;width:100%;height:auto;" />`
    : "";
  const intro = opts.spotifySaved
    ? "Just added to your library — open Spotify to listen."
    : "Listen now on Apple Music, Spotify, or wherever you stream.";
  const buttons = opts.links
    .map(
      (l) =>
        `<a href="${l.url}" style="display:inline-block;margin:6px;padding:12px 22px;background:#00FF85;color:#000;border-radius:999px;text-decoration:none;font-weight:700;">${l.platform}</a>`
    )
    .join("");
  return `<div style="font-family:'Plus Jakarta Sans',-apple-system,sans-serif;background:#0A0A0A;color:#fff;padding:32px 16px;max-width:560px;margin:0 auto;text-align:center;">
    ${cover}
    <h1 style="font-size:24px;font-weight:700;margin:0 0 6px;">${opts.trackTitle} is out now</h1>
    <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 20px;">${opts.artistName}</p>
    <p style="font-size:15px;color:#fff;margin:0 0 24px;">${intro}</p>
    <div>${buttons}</div>
    <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:32px 0 0;">Powered by <a href="https://uply.tv" style="color:#00FF85;text-decoration:none;">UPLY</a></p>
  </div>`;
}

function creatorWarningHtml(trackTitle: string) {
  return `<div style="font-family:'Plus Jakarta Sans',-apple-system,sans-serif;background:#0A0A0A;color:#fff;padding:32px 16px;max-width:560px;margin:0 auto;">
    <h1 style="font-size:20px;font-weight:700;color:#fff;">Heads up — Spotify presave didn't fire</h1>
    <p style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;">Your presave campaign for <strong>${trackTitle}</strong> reached its release date but distribution wasn't confirmed for Spotify — subscribers got an email instead. Confirm distribution and contact subscribers manually if needed.</p>
  </div>`;
}

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: campaigns, error } = await supabase
    .from("presave_campaigns")
    .select("*, tracks!inner(id, title, cover_art_url, creator_id)")
    .eq("status", "active")
    .lte("release_at", new Date().toISOString());

  if (error) {
    console.error("[release-day] fetch campaigns", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const results: any[] = [];

  for (const campaign of campaigns ?? []) {
    const track = (campaign as any).tracks;
    if (!track) continue;
    if (!campaign.distribution_confirmed_spotify && !campaign.distribution_confirmed_apple) {
      results.push({ campaign: campaign.id, skipped: "no distribution confirmed" });
      continue;
    }

    // fetch creator email + universal links + artist name
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("display_name, email, username")
      .eq("id", campaign.creator_id)
      .maybeSingle();
    const artistName = creatorProfile?.display_name || creatorProfile?.username || "Artist";

    const { data: linkRows } = await supabase
      .from("track_universal_links")
      .select("platform, url")
      .eq("track_id", campaign.track_id);
    const links = (linkRows ?? []).map((l: any) => ({
      platform: l.platform.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      url: l.url,
    }));

    const trackId = parseSpotifyTrackId(campaign.spotify_track_uri);

    const { data: subs } = await supabase
      .from("presave_subscribers")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("fulfilled", false);

    let spotifySkippedNoDist = false;

    for (const sub of subs ?? []) {
      let failure: string | null = null;
      let spotifySaved = false;

      try {
        if (sub.platform === "spotify") {
          if (!campaign.distribution_confirmed_spotify || !trackId) {
            spotifySkippedNoDist = spotifySkippedNoDist || !campaign.distribution_confirmed_spotify;
            failure = !campaign.distribution_confirmed_spotify
              ? "spotify_distribution_not_confirmed"
              : "missing_spotify_track_uri";
          } else if (sub.spotify_refresh_token) {
            const token = await refreshSpotifyToken(sub.spotify_refresh_token);
            if (!token) {
              failure = "spotify_token_refresh_failed";
            } else {
              if (sub.consent_save_track) {
                spotifySaved = await spotifySaveTrack(token, trackId);
                if (!spotifySaved) failure = "spotify_save_failed";
              }
              if (sub.consent_follow_artist) {
                await spotifyFollowArtistFromTrack(token, trackId);
              }
            }
          } else {
            failure = "missing_spotify_refresh_token";
          }
        } else if (sub.platform === "apple_music") {
          if (campaign.distribution_confirmed_apple && sub.apple_music_user_token && campaign.apple_album_id) {
            const ok = await appleAddAlbum(sub.apple_music_user_token, campaign.apple_album_id);
            if (!ok) failure = "apple_add_failed";
          }
          // email-only fallback handled below
        }

        // Always send the "it's live" email
        await sendEmail(
          sub.email,
          `${track.title} is out now`,
          liveEmailHtml({
            trackTitle: track.title,
            artistName,
            coverUrl: campaign.cover_art_url || track.cover_art_url,
            spotifySaved,
            links,
          })
        );
      } catch (e: any) {
        failure = `exception:${e?.message || String(e)}`;
      }

      await supabase
        .from("presave_subscribers")
        .update({
          fulfilled: !failure,
          fulfilled_at: !failure ? new Date().toISOString() : null,
          failure_reason: failure,
        })
        .eq("id", sub.id);
    }

    if (spotifySkippedNoDist && creatorProfile?.email) {
      await sendEmail(
        creatorProfile.email,
        `Action needed: ${track.title} presave didn't fire on Spotify`,
        creatorWarningHtml(track.title)
      );
    }

    await supabase
      .from("presave_campaigns")
      .update({ status: "released" })
      .eq("id", campaign.id);

    results.push({ campaign: campaign.id, processed: subs?.length ?? 0 });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
