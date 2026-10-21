// Release-day presave conversion cron worker
// Finds smart_links where is_presave=true, presave_converted=false, release_date <= now()
// For each, refreshes Spotify tokens for all pending presaves and fires save-track API call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function buildReleaseEmailHtml(link: any, listenUrl: string | null): string {
  const safeTitle = String(link.title || "Your track").replace(/</g, "&lt;");
  const safeArtist = link.artist ? String(link.artist).replace(/</g, "&lt;") : "";
  const cover = link.cover_image_url
    ? `<img src="${link.cover_image_url}" alt="" width="320" height="320" style="display:block;margin:0 auto 24px;border-radius:16px;max-width:320px;width:100%;height:auto;" />`
    : "";
  const ctaHref = listenUrl || `https://uply.tv/link/${link.slug}`;
  return `
    <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;background:#0A0A0A;color:#fff;padding:32px 16px;max-width:560px;margin:0 auto;text-align:center;">
      ${cover}
      <h1 style="font-size:26px;font-weight:700;margin:0 0 8px;color:#fff;">${safeTitle}</h1>
      ${safeArtist ? `<p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 16px;">${safeArtist}</p>` : ""}
      <p style="font-size:15px;color:#fff;margin:0 0 28px;">It's finally here. You pre-saved this — now it's time to listen.</p>
      <a href="${ctaHref}" style="display:inline-block;background:#00FF85;color:#0A0A0A;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:15px;">Listen Now →</a>
      <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:32px 0 0;">You're receiving this because you pre-saved on UPLY SmartLinks.</p>
    </div>
  `;
}

async function sendReleaseEmail(toEmail: string, link: any) {
  if (!RESEND_API_KEY) return;
  const platforms = (link.platforms || {}) as Record<string, string>;
  const listenUrl = platforms.spotify || platforms.apple_music || platforms.youtube || null;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UPLY <notify@notify.uply.tv>",
        to: toEmail,
        subject: `🎵 ${link.title} is out now${link.artist ? ` — ${link.artist}` : ""}`,
        html: buildReleaseEmailHtml(link, listenUrl),
      }),
    });
  } catch (e) {
    console.error("[release-cron] release email failed:", e);
  }
}

async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token as string;
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

  // Find released presave links not yet converted
  const { data: links, error } = await supabase
    .from("smart_links")
    .select("*")
    .eq("is_presave", true)
    .eq("presave_converted", false)
    .lte("release_date", new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalConverted = 0;
  for (const link of links || []) {
    const { data: presaves } = await supabase
      .from("smart_link_presaves")
      .select("*")
      .eq("link_id", link.id)
      .is("converted_at", null);

    for (const p of presaves || []) {
      const accessToken = await refreshSpotifyToken(p.spotify_refresh_token);
      if (!accessToken) continue;

      const id = p.spotify_track_id || p.spotify_album_id;
      if (!id) continue;
      const url = p.spotify_track_id
        ? `https://api.spotify.com/v1/me/tracks?ids=${id}`
        : `https://api.spotify.com/v1/me/albums?ids=${id}`;

      const saveRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (saveRes.ok) {
        await supabase
          .from("smart_link_presaves")
          .update({ converted_at: new Date().toISOString() })
          .eq("id", p.id);
        totalConverted++;

        // Notify the fan their pre-saved track is out now (fire-and-forget)
        if (p.fan_email) {
          await sendReleaseEmail(p.fan_email, link);
        }
      }
    }

    // Only flip the link-level flag once ALL pending presaves have converted
    const { count: pendingCount } = await supabase
      .from("smart_link_presaves")
      .select("*", { head: true, count: "exact" })
      .eq("link_id", link.id)
      .is("converted_at", null);

    if ((pendingCount ?? 0) === 0) {
      await supabase
        .from("smart_links")
        .update({ presave_converted: true })
        .eq("id", link.id);
    }
  }

  return new Response(
    JSON.stringify({ links_processed: links?.length || 0, total_converted: totalConverted }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}));
