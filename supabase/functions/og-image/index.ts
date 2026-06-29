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
    const requestUrl = new URL(req.url);
    const requestedPath = requestUrl.searchParams.get("path") || "/";
    const requestedUrl = new URL(requestedPath, SITE_URL);
    const path = requestedUrl.pathname;
    const canonicalUrl = `${SITE_URL}${requestedUrl.pathname}${requestedUrl.search}`;
    const userAgent = req.headers.get("user-agent") || "";

    // Only serve OG HTML to bots — real users get redirected
    if (!BOT_UA.test(userAgent)) {
      return new Response(null, {
        status: 302,
          headers: { ...corsHeaders, Location: canonicalUrl },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Arya XO artist pages — custom OG so iMessage/social previews show his face.
    if (/^\/(arya|aryaxo|arya-xo(\/links|-links|-site)?)$/i.test(path)) {
      const isSite = /site/i.test(path);
      const isLinks = /links/i.test(path) || path.toLowerCase() === "/arya-xo" || path.toLowerCase() === "/arya" || path.toLowerCase() === "/aryaxo";
      return new Response(
        buildHtml({
          title: isSite
            ? "Arya XO — Official Site · 150 BANDS w/ HUGEL & NBA YoungBoy"
            : "Arya XO — Singer, Rapper · 150 BANDS w/ HUGEL & NBA YoungBoy",
          description:
            "Arya XO — 22-year-old Iranian American rapper, singer & actor. '150 BANDS' with HUGEL & NBA YoungBoy out now. Listen, watch and book on UPLY.",
          image: `${SITE_URL}/arya-xo-og.png`,
          url: canonicalUrl,
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

    const streamRouteMatch = path.match(/^\/stream\/([^/]+)$/);
    if (streamRouteMatch) {
      const [, id] = streamRouteMatch;
      const isRecordingRoute = requestedUrl.searchParams.get("type") === "recording";

      if (isRecordingRoute) {
        const { data: recording } = await supabase
          .from("stream_recordings")
          .select("title, description, playback_id, creator_id")
          .eq("id", id)
          .maybeSingle();

        if (recording) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", recording.creator_id)
            .maybeSingle();

          const creatorName = profile?.display_name || "Creator";
          const image = recording.playback_id
            ? `https://image.mux.com/${recording.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
            : DEFAULT_IMAGE;

          return new Response(
            buildHtml({
              title: `${recording.title} — ${creatorName} on UPLY`,
              description: recording.description || `Watch ${recording.title} by ${creatorName} on UPLY`,
              image,
              url: canonicalUrl,
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

      const { data: stream } = await supabase
        .from("mux_live_streams")
        .select("id, title, description, mux_playback_id, thumbnail_url, user_id, status")
        .eq("id", id)
        .maybeSingle();

      if (stream) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", stream.user_id)
          .maybeSingle();

        const creatorName = profile?.display_name || "Creator";
        let title = stream.title || "Live Stream";
        let description = stream.description || `Watch ${creatorName} live on UPLY`;
        let image = stream.mux_playback_id
          ? `https://image.mux.com/${stream.mux_playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
          : stream.thumbnail_url || DEFAULT_IMAGE;

        if (stream.status !== "active") {
          const { data: session } = await supabase
            .from("live_stream_sessions")
            .select("mux_asset_id")
            .eq("stream_id", stream.id)
            .not("mux_asset_id", "is", null)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (session?.mux_asset_id) {
            const { data: recording } = await supabase
              .from("stream_recordings")
              .select("title, description, playback_id")
              .eq("mux_asset_id", session.mux_asset_id)
              .maybeSingle();

            if (recording) {
              title = recording.title || title;
              description = recording.description || `Watch ${title} by ${creatorName} on UPLY`;
              if (recording.playback_id) {
                image = `https://image.mux.com/${recording.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`;
              }
            }
          }
        }

        return new Response(
          buildHtml({
            title: `${title} — ${creatorName} on UPLY`,
            description,
            image,
            url: canonicalUrl,
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

    // SmartLink: /link/:slug
    const smartLinkMatch = path.match(/^\/link\/([^/]+)$/);
    if (smartLinkMatch) {
      const [, slug] = smartLinkMatch;
      const { data: link } = await supabase
        .from("smart_links")
        .select("title, artist, description, cover_image_url, is_presave")
        .eq("slug", slug)
        .maybeSingle();

      if (link) {
        const titlePrefix = link.is_presave ? "Pre-save" : "Listen now";
        const ogTitle = link.artist
          ? `${link.title} — ${link.artist}`
          : link.title;
        const ogDesc =
          link.description ||
          `${titlePrefix}: ${link.title}${link.artist ? ` by ${link.artist}` : ""} on every streaming platform.`;
        return new Response(
          buildHtml({
            title: `${ogTitle} | UPLY SmartLink`,
            description: ogDesc,
            image: link.cover_image_url || DEFAULT_IMAGE,
            url: canonicalUrl,
            type: "music.song",
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

    // Match referral/invite links: /r/:code, /join/:code, /join/:username/:code, /invite/:code
    const refMatch =
      path.match(/^\/r\/([^/]+)$/) ||
      path.match(/^\/join\/[^/]+\/([^/]+)$/) ||
      path.match(/^\/join\/([^/]+)$/) ||
      path.match(/^\/invite\/([^/]+)$/);

    if (refMatch) {
      const code = refMatch[1];

      // Use the security-definer RPC to look up referrer info
      const { data: referrer } = await supabase.rpc("lookup_referrer_by_code", {
        ref_code: code,
      });

      const name = referrer?.display_name || null;
      const ogTitle = name
        ? `${name} invited you to UPLY`
        : "You've been invited to UPLY";
      const ogDesc = name
        ? `You have exclusive early access. Join ${name} on the platform where creators turn audiences into income. Your spot won't last long.`
        : "Exclusive early access to the creator monetization platform. Your invite is waiting.";

      return new Response(
        buildHtml({
          title: ogTitle,
          description: ogDesc,
          image: DEFAULT_IMAGE,
          url: canonicalUrl,
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("username", decodeURIComponent(username))
        .maybeSingle();

      let liveQuery = supabase
        .from("mux_live_streams")
        .select("id, title, description, mux_playback_id, thumbnail_url, user_id, status")
        .eq("slug", slug)
        .order("created_at", { ascending: false })
        .limit(1);

      if (profile?.user_id) {
        liveQuery = liveQuery.eq("user_id", profile.user_id);
      }

      const { data: stream } = await liveQuery.maybeSingle();

      if (stream) {
        let creatorName = profile?.display_name || username;
        if (!profile?.display_name) {
          const { data: fallbackProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", stream.user_id)
            .maybeSingle();
          if (fallbackProfile?.display_name) creatorName = fallbackProfile.display_name;
        }

        let title = stream.title || "Live Stream";
        let description = stream.description || `Watch ${creatorName} live on UPLY`;
        let image = stream.mux_playback_id
          ? `https://image.mux.com/${stream.mux_playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
          : stream.thumbnail_url || DEFAULT_IMAGE;

        // If stream is no longer active, resolve to the recording thumbnail
        if (stream.status !== "active") {
          const { data: session } = await supabase
            .from("live_stream_sessions")
            .select("mux_asset_id")
            .eq("stream_id", stream.id)
            .not("mux_asset_id", "is", null)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (session?.mux_asset_id) {
            const { data: recording } = await supabase
              .from("stream_recordings")
              .select("title, description, playback_id")
              .eq("mux_asset_id", session.mux_asset_id)
              .maybeSingle();

            if (recording) {
              title = recording.title || title;
              description = recording.description || description;
              if (recording.playback_id) {
                image = `https://image.mux.com/${recording.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`;
              }
            }
          }
        }

        return new Response(
          buildHtml({
            title: `${title} — ${creatorName} on UPLY`,
            description,
            image,
            url: canonicalUrl,
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
            url: canonicalUrl,
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

    // Match /@:slug (canonical social creator page)
    const atSlugMatch = path.match(/^\/@([^/]+)$/);
    if (atSlugMatch) {
      const [, slug] = atSlugMatch;

      // Try artist_profiles vanity_slug first, then profiles username
      let { data: artist } = await supabase
        .from("artist_profiles")
        .select("user_id, vanity_slug, header_image_url, hero_image_url, tagline, artist_bio, seo_title, seo_description, seo_og_image, is_verified, social_links")
        .eq("vanity_slug", decodeURIComponent(slug))
        .maybeSingle();

      let profile: any = null;
      if (artist?.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, username, creator_type, cover_image_url")
          .eq("user_id", artist.user_id)
          .maybeSingle();
        profile = p;
      }

      // Fallback: treat slug as username
      if (!profile) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, username, creator_type, cover_image_url")
          .eq("username", decodeURIComponent(slug))
          .maybeSingle();
        if (p) {
          profile = p;
          const { data: a2 } = await supabase
            .from("artist_profiles")
            .select("header_image_url, hero_image_url, tagline, artist_bio, seo_title, seo_description, seo_og_image, is_verified, social_links")
            .eq("user_id", p.user_id)
            .maybeSingle();
          if (a2) artist = a2;
        }
      }

      if (profile) {
        const displayName = profile.display_name || slug;
        const creatorType = profile.creator_type ? ` · ${profile.creator_type}` : "";
        const title = (artist?.seo_title || `${displayName}${creatorType} — UPLY`).slice(0, 70);
        const descRaw = artist?.seo_description || artist?.tagline || artist?.artist_bio || profile.bio || `Check out ${displayName} on UPLY`;
        const description = descRaw.length > 160 ? descRaw.slice(0, 157) + "…" : descRaw;
        const image = artist?.seo_og_image || artist?.header_image_url || artist?.hero_image_url || profile.cover_image_url || profile.avatar_url || DEFAULT_IMAGE;

        return new Response(
          buildHtml({
            title,
            description,
            image,
            url: canonicalUrl,
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

    const profileMatch = path.match(/^\/creator\/([^/]+)$/) || path.match(/^\/([^/]+)$/);
    if (profileMatch) {
      const [, username] = profileMatch;
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio, username, creator_type, cover_image_url")
        .eq("username", decodeURIComponent(username))
        .maybeSingle();

      if (profile) {
        // Enrich with artist_profiles data if available
        const { data: artist } = await supabase
          .from("artist_profiles")
          .select("header_image_url, hero_image_url, tagline, artist_bio, seo_title, seo_description, seo_og_image, is_verified, vanity_slug")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        const displayName = profile.display_name || username;
        const creatorType = profile.creator_type ? ` · ${profile.creator_type}` : "";
        const title = (artist?.seo_title || `${displayName}${creatorType} — UPLY`).slice(0, 70);
        const descRaw = artist?.seo_description || artist?.tagline || artist?.artist_bio || profile.bio || `Check out ${displayName} on UPLY`;
        const description = descRaw.length > 160 ? descRaw.slice(0, 157) + "…" : descRaw;
        const image = artist?.seo_og_image || artist?.header_image_url || artist?.hero_image_url || profile.cover_image_url || profile.avatar_url || DEFAULT_IMAGE;
        const url = `${SITE_URL}/${artist?.vanity_slug ? `@${artist.vanity_slug}` : profile.username || username}`;

        return new Response(
          buildHtml({
            title,
            description,
            image,
            url,
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
        url: canonicalUrl,
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
