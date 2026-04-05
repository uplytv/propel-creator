const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function secondsToIso(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const APPLE_CATEGORY_MAP: Record<string, string> = {
  "Business Strategy": "Business",
  "Entrepreneurship": "Business",
  "Personal Finance": "Business",
  "Investing & Trading": "Business",
  "Real Estate": "Business",
  "Fitness & Nutrition": "Health &amp; Fitness",
  "Mental Health & Wellness": "Health &amp; Fitness",
  "Music Production": "Music",
  "DJing": "Music",
  "Podcasting": "Arts",
  "Content Creation": "Arts",
  "AI & Tech": "Technology",
  "Web Development": "Technology",
  "Gaming": "Leisure",
  "Faith & Community": "Religion &amp; Spirituality",
  "Education & Tutoring": "Education",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const username = url.searchParams.get("username") || url.pathname.split("/").pop();

  if (!username || username === "podcast-rss") {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>username parameter required. Use ?username=yourname</error>`,
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, user_id, display_name, username, bio, avatar_url, cover_image_url, channel_category, channel_tagline, website")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    const { data: p2 } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, username, bio, avatar_url, cover_image_url, channel_category, channel_tagline, website")
      .ilike("display_name", username)
      .maybeSingle();
    profile = p2;
  }

  if (!profile) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Creator not found</error>`,
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" } }
    );
  }

  const { data: recordings } = await supabase
    .from("stream_recordings")
    .select("id, title, description, duration_seconds, created_at, playback_id, download_url, mux_asset_id, slug")
    .eq("creator_id", profile.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, description, duration_seconds, created_at, playback_id, download_url, mux_asset_id, slug, thumbnail_url")
    .eq("creator_id", profile.user_id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const allItems = [
    ...(recordings || []).map((r: any) => ({ ...r, _type: "recording" })),
    ...(videos || []).map((v: any) => ({ ...v, _type: "video" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const creatorName = escapeXml(profile.display_name || profile.username || "Creator");
  const slug = profile.username || profile.id;
  const feedUrl = `https://uply.tv/functions/v1/podcast-rss?username=${slug}`;
  const channelUrl = `https://uply.tv/creator/${slug}`;
  const imageUrl = profile.avatar_url || profile.cover_image_url || "https://uply.tv/logo.png";
  const appleCategory = APPLE_CATEGORY_MAP[profile.channel_category || ""] || "Society &amp; Culture";
  const lastBuildDate = allItems.length > 0 ? new Date(allItems[0].created_at).toUTCString() : new Date().toUTCString();

  const episodeItems = allItems.map((item: any) => {
    const title = escapeXml(item.title || "Untitled Episode");
    const pubDate = new Date(item.created_at).toUTCString();
    const duration = item.duration_seconds ? secondsToIso(item.duration_seconds) : "0:00";
    const guid = `uply-${item._type}-${item.id}`;
    const episodeUrl = item._type === "recording"
      ? `https://uply.tv/stream/${item.id}?type=recording`
      : `https://uply.tv/stream/${item.id}?type=vod`;
    const enclosureUrl = item.download_url ||
      (item.playback_id ? `https://stream.mux.com/${item.playback_id}/high.mp4` : null);
    const enclosureTag = enclosureUrl
      ? `<enclosure url="${escapeXml(enclosureUrl)}" length="0" type="audio/mpeg" />`
      : "";
    const thumbnail = item.thumbnail_url || (item.playback_id ? `https://image.mux.com/${item.playback_id}/thumbnail.jpg` : imageUrl);

    return `
    <item>
      <title>${title}</title>
      <description><![CDATA[${item.description || `Episode from ${creatorName}`}]]></description>
      <link>${episodeUrl}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:title>${title}</itunes:title>
      <itunes:summary><![CDATA[${item.description || `Episode from ${creatorName}`}]]></itunes:summary>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:image href="${escapeXml(thumbnail)}" />
      <itunes:explicit>false</itunes:explicit>
      ${enclosureTag}
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${creatorName}</title>
    <link>${channelUrl}</link>
    <description><![CDATA[${profile.bio || profile.channel_tagline || `${creatorName}'s podcast on UPLY`}]]></description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <itunes:author>${creatorName}</itunes:author>
    <itunes:summary><![CDATA[${profile.bio || profile.channel_tagline || `${creatorName}'s podcast on UPLY`}]]></itunes:summary>
    <itunes:owner>
      <itunes:name>${creatorName}</itunes:name>
    </itunes:owner>
    <itunes:image href="${escapeXml(imageUrl)}" />
    <itunes:category text="${appleCategory}" />
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <image>
      <url>${escapeXml(imageUrl)}</url>
      <title>${creatorName}</title>
      <link>${channelUrl}</link>
    </image>
${episodeItems}
  </channel>
</rss>`;

  return new Response(rss, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
