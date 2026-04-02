import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    let creatorId = url.searchParams.get("creator_id");

    if (!username && !creatorId) return new Response("Missing username or creator_id", { status: 400, headers: corsHeaders });

    if (username && !creatorId) {
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).single();
      if (!profile) return new Response("Creator not found", { status: 404, headers: corsHeaders });
      creatorId = profile.id;
    }

    const { data: podcast } = await supabase.from("creator_podcasts").select("*").eq("creator_id", creatorId).eq("is_private", false).single();
    if (!podcast) return new Response("Podcast not found", { status: 404, headers: corsHeaders });

    const { data: episodes } = await supabase.from("podcast_episodes").select("*")
      .eq("podcast_id", podcast.id).eq("is_published", true).eq("is_members_only", false)
      .order("published_at", { ascending: false });

    const escXml = (s: string) => s?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") || "";

    const items = (episodes || []).map((ep: any) => `
    <item>
      <title>${escXml(ep.title)}</title>
      <description><![CDATA[${ep.description || ""}]]></description>
      <enclosure url="${escXml(ep.audio_url)}" type="audio/mpeg" ${ep.audio_file_size ? `length="${ep.audio_file_size}"` : 'length="0"'} />
      <pubDate>${new Date(ep.published_at || ep.created_at).toUTCString()}</pubDate>
      <itunes:duration>${ep.audio_duration || 0}</itunes:duration>
      <itunes:episode>${ep.episode_number || 1}</itunes:episode>
      <itunes:season>${ep.season_number || 1}</itunes:season>
      <itunes:episodeType>${ep.episode_type || "full"}</itunes:episodeType>
      <itunes:explicit>${ep.is_explicit ? "yes" : "no"}</itunes:explicit>
    </item>`).join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escXml(podcast.title)}</title>
    <description><![CDATA[${podcast.description || ""}]]></description>
    <language>${podcast.language || "en"}</language>
    <itunes:author>${escXml(podcast.author || podcast.title)}</itunes:author>
    ${podcast.artwork_url ? `<itunes:image href="${escXml(podcast.artwork_url)}" />` : ""}
    ${podcast.category ? `<itunes:category text="${escXml(podcast.category)}" />` : ""}
    <itunes:explicit>${podcast.is_explicit ? "yes" : "no"}</itunes:explicit>
    <link>https://uply.tv</link>${items}
  </channel>
</rss>`;

    return new Response(rss, { headers: { ...corsHeaders, "Content-Type": "application/rss+xml; charset=utf-8" } });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});
