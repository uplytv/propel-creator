// Public sitemap.xml — surfaces top public content for search engines.
// No auth required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://uply.tv";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

const STATIC_PATHS = [
  { loc: "/", priority: 1.0, changefreq: "daily" },
  { loc: "/discover", priority: 0.9, changefreq: "hourly" },
  { loc: "/trending", priority: 0.9, changefreq: "hourly" },
  { loc: "/live", priority: 0.9, changefreq: "always" },
  { loc: "/for-you", priority: 0.8, changefreq: "hourly" },
  { loc: "/new", priority: 0.7, changefreq: "daily" },
  { loc: "/search", priority: 0.5, changefreq: "weekly" },
  { loc: "/c/fitness", priority: 0.7, changefreq: "daily" },
  { loc: "/c/finance", priority: 0.7, changefreq: "daily" },
  { loc: "/c/gaming", priority: 0.7, changefreq: "daily" },
  { loc: "/c/business", priority: 0.7, changefreq: "daily" },
  { loc: "/c/music", priority: 0.7, changefreq: "daily" },
  { loc: "/c/education", priority: 0.7, changefreq: "daily" },
  { loc: "/c/lifestyle", priority: 0.7, changefreq: "daily" },
  { loc: "/c/irl", priority: 0.7, changefreq: "daily" },
  // Roster-backed artist profiles (mirrors slugs in src/data/artistRoster.ts)
  { loc: "/@omid", priority: 0.9, changefreq: "weekly" },
  { loc: "/@morvarid", priority: 0.9, changefreq: "weekly" },
  { loc: "/@andy", priority: 0.9, changefreq: "weekly" },
  { loc: "/@arya-xo", priority: 0.9, changefreq: "weekly" },
];


function urlEntry(loc: string, lastmod?: string, priority = 0.5, changefreq = "weekly") {
  return `  <url>
    <loc>${SITE}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const entries: string[] = [];

  for (const p of STATIC_PATHS) entries.push(urlEntry(p.loc, undefined, p.priority, p.changefreq));

  // Top creator profiles (recent + popular)
  const { data: creators } = await sb
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null)
    .eq("is_approved", true)
    .order("updated_at", { ascending: false })
    .limit(2000);
  for (const c of creators ?? []) {
    if (c.username) entries.push(urlEntry(`/${c.username}`, c.updated_at?.slice(0, 10), 0.8, "daily"));
  }

  // Recent videos
  const { data: videos } = await sb
    .from("videos")
    .select("slug, created_at, profiles:creator_id(username)")
    .not("slug", "is", null)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(2000);
  for (const v of videos ?? []) {
    const u = (v as any).profiles?.username;
    if (u && v.slug) entries.push(urlEntry(`/${u}/videos/${v.slug}`, v.created_at?.slice(0, 10), 0.7, "weekly"));
  }

  // Recent clips
  const { data: clips } = await sb
    .from("clips")
    .select("slug, created_at, profiles:creator_id(username)")
    .not("slug", "is", null)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(2000);
  for (const c of clips ?? []) {
    const u = (c as any).profiles?.username;
    if (u && c.slug) entries.push(urlEntry(`/${u}/clips/${c.slug}`, c.created_at?.slice(0, 10), 0.6, "weekly"));
  }

  // Active community posts
  const { data: posts } = await sb
    .from("community_posts")
    .select("slug, created_at, profiles:creator_id(username)")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(1500);
  for (const p of posts ?? []) {
    const u = (p as any).profiles?.username;
    if (u && p.slug) entries.push(urlEntry(`/${u}/community/${p.slug}`, p.created_at?.slice(0, 10), 0.5, "weekly"));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, { headers: corsHeaders });
});
