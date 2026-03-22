import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://uply.tv";
const DEFAULT_TITLE = "Uply — A Social Network for Creators to Monetize";
const DEFAULT_DESC =
  "The creator platform that invests more in you as you grow. Monetize your community, go live, sell courses, and scale with AI — all in one place.";
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/cikFlxVx8jfBrfytYvhbk5DVvYT2/social-images/social-1773093383614-084CEBC0-15D0-4F96-A3BD-D7F3F8441A0D.webp";

function buildHtml(meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  twitterCard: string;
  siteName: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}"/>
<meta property="og:title" content="${esc(meta.title)}"/>
<meta property="og:description" content="${esc(meta.description)}"/>
<meta property="og:image" content="${esc(meta.image)}"/>
<meta property="og:url" content="${esc(meta.url)}"/>
<meta property="og:type" content="${esc(meta.type)}"/>
<meta property="og:site_name" content="${esc(meta.siteName)}"/>
<meta name="twitter:card" content="${esc(meta.twitterCard)}"/>
<meta name="twitter:title" content="${esc(meta.title)}"/>
<meta name="twitter:description" content="${esc(meta.description)}"/>
<meta name="twitter:image" content="${esc(meta.image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(meta.url)}"/>
</head>
<body>
<p>Redirecting to <a href="${esc(meta.url)}">${esc(meta.title)}</a>...</p>
</body>
</html>`;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Applebot|iMessageBot|Googlebot|bingbot|Embedly|Quora Link Preview|Showyoubot|outbrain|pinterest|vkShare|redditbot/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const userAgent = req.headers.get("user-agent") || "";

    // Only serve OG HTML to bots — real users get redirected
    if (!BOT_UA.test(userAgent)) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `${SITE_URL}${path}` },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Match /r/:code (referral links)
    const referralMatch = path.match(/^\/r\/([^/]+)$/);
    if (referralMatch) {
      const [, code] = referralMatch;

      // Try referral_code on profiles first
      let profile = null;
      const { data: byRef } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, username")
        .eq("referral_code", code)
        .maybeSingle();
      if (byRef) profile = byRef;

      // Try invite_codes table
      if (!profile) {
        const { data: invite } = await supabase
          .from("invite_codes")
          .select("owner_id")
          .eq("code", code)
          .maybeSingle();
        if (invite) {
          const { data: owner } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, username")
            .eq("user_id", invite.owner_id)
            .maybeSingle();
          if (owner) profile = owner;
        }
      }

      if (profile) {
        const name = profile.display_name || "Someone";
        const avatarImg = profile.avatar_url || DEFAULT_IMAGE;

        return new Response(
          buildHtml({
            title: `${name} invited you to join UPLY`,
            description: `Join ${name}'s community on UPLY — where creators get paid.`,
            image: avatarImg,
            url: `${SITE_URL}/r/${code}`,
            type: "website",
            twitterCard: "summary_large_image",
            siteName: "Uply",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          }
        );
      }
    }

    // Match /:username/videos/:slug
    const videoMatch = path.match(/^\/([^/]+)\/videos\/([^/]+)$/);
    if (videoMatch) {
      const [, username, slug] = videoMatch;
      const { data: video } = await supabase
        .from("videos")
        .select("title, description, playback_id, thumbnail_url, slug, creator_id")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (video) {
        let creatorName = username;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", video.creator_id)
          .maybeSingle();
        if (profile?.display_name) creatorName = profile.display_name;

        const image = video.playback_id
          ? `https://image.mux.com/${video.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
          : video.thumbnail_url || DEFAULT_IMAGE;

        return new Response(
          buildHtml({
            title: `${video.title} — ${creatorName} on UPLY`,
            description: video.description || `Watch ${video.title} by ${creatorName} on UPLY`,
            image,
            url: `${SITE_URL}${path}`,
            type: "video.other",
            twitterCard: "summary_large_image",
            siteName: "Uply",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          }
        );
      }
    }

    // Match /:username/live/:slug
    const liveMatch = path.match(/^\/([^/]+)\/live\/([^/]+)$/);
    if (liveMatch) {
      const [, username, slug] = liveMatch;
      const { data: stream } = await supabase
        .from("mux_live_streams")
        .select("title, description, playback_id, thumbnail_url, user_id")
        .eq("slug", slug)
        .maybeSingle();

      if (stream) {
        let creatorName = username;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", stream.user_id)
          .maybeSingle();
        if (profile?.display_name) creatorName = profile.display_name;

        const image = stream.playback_id
          ? `https://image.mux.com/${stream.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
          : stream.thumbnail_url || DEFAULT_IMAGE;

        return new Response(
          buildHtml({
            title: `${stream.title} — ${creatorName} Live on UPLY`,
            description: stream.description || `Watch ${creatorName} live on UPLY`,
            image,
            url: `${SITE_URL}${path}`,
            type: "video.other",
            twitterCard: "summary_large_image",
            siteName: "Uply",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=300",
            },
          }
        );
      }
    }

    // Match /:username/clips/:slug
    const clipMatch = path.match(/^\/([^/]+)\/clips\/([^/]+)$/);
    if (clipMatch) {
      const [, username, slug] = clipMatch;
      const { data: clip } = await supabase
        .from("clips")
        .select("caption, clip_playback_id, creator_id, slug")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (clip) {
        let creatorName = username;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", clip.creator_id)
          .maybeSingle();
        if (profile?.display_name) creatorName = profile.display_name;

        const image = clip.clip_playback_id
          ? `https://image.mux.com/${clip.clip_playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
          : DEFAULT_IMAGE;

        return new Response(
          buildHtml({
            title: `${clip.caption || "Clip"} — ${creatorName} on UPLY`,
            description: `Watch this clip by ${creatorName} on UPLY`,
            image,
            url: `${SITE_URL}${path}`,
            type: "video.other",
            twitterCard: "summary_large_image",
            siteName: "Uply",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          }
        );
      }
    }

    // Match /:username (creator profile)
    const profileMatch = path.match(/^\/([^/]+)$/);
    if (profileMatch) {
      const [, username] = profileMatch;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, username")
        .eq("username", username)
        .maybeSingle();

      if (profile) {
        return new Response(
          buildHtml({
            title: `${profile.display_name || username} on UPLY`,
            description: profile.bio || `Check out ${profile.display_name || username} on UPLY`,
            image: profile.avatar_url || DEFAULT_IMAGE,
            url: `${SITE_URL}${path}`,
            type: "profile",
            twitterCard: "summary_large_image",
            siteName: "Uply",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          }
        );
      }
    }

    // Fallback — default OG tags
    return new Response(
      buildHtml({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESC,
        image: DEFAULT_IMAGE,
        url: `${SITE_URL}${path}`,
        type: "website",
        twitterCard: "summary_large_image",
        siteName: "Uply",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (err) {
    console.error("og-image error:", err);
    return new Response(
      buildHtml({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESC,
        image: DEFAULT_IMAGE,
        url: SITE_URL,
        type: "website",
        twitterCard: "summary_large_image",
        siteName: "Uply",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }
});
