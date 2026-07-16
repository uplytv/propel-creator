import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ARTIST_ROSTER, type ArtistBlogPost } from "@/data/artistRoster";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import ArtistSectionNav from "./ArtistSectionNav";
import ArtistDisclaimers from "./ArtistDisclaimers";

interface DbPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string | null;
  read_time: string;
  published: boolean;
  published_at: string;
}

function mergedPosts(staticPosts: ArtistBlogPost[], dbPosts: DbPost[]): ArtistBlogPost[] {
  const dbAsStatic: ArtistBlogPost[] = dbPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    tag: p.tag ?? undefined,
    readTime: p.read_time,
    publishedAt: p.published_at,
    coverUrl: staticPosts.find((sp) => sp.slug === p.slug)?.coverUrl,
  }));
  // DB wins over static on slug collision
  const dbSlugs = new Set(dbAsStatic.map((p) => p.slug));
  const merged = [
    ...dbAsStatic,
    ...staticPosts.filter((p) => !dbSlugs.has(p.slug)),
  ];
  return merged.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export default function ArtistBlogPage() {
  const { slug = "", postSlug } = useParams();
  const { session } = useAuth();
  const artist = ARTIST_ROSTER.find(
    (a) => a.slug === slug || (a.aliases ?? []).includes(slug),
  );

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Blog · UPLY`;
  }, [artist]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role" as any, {
        _user_id: session!.user.id,
        _role: "admin",
      });
      return !!data;
    },
  });

  const { data: dbPosts = [] } = useQuery({
    queryKey: ["artist-blog-posts-public", artist?.slug],
    enabled: !!artist,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_blog_posts")
        .select("id, slug, title, excerpt, body, tag, read_time, published, published_at")
        .eq("artist_slug", artist!.slug)
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DbPost[];
    },
  });

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center">
          <p className="opacity-60">Artist not found.</p>
          <Link to="/" className="underline mt-2 inline-block">Back to UPLY</Link>
        </div>
      </main>
    );
  }

  const posts = mergedPosts(artist.posts ?? [], dbPosts);
  const post = postSlug ? posts.find((p) => p.slug === postSlug) : null;

  if (post) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <article className="max-w-[720px] mx-auto px-6 pt-14 pb-24">
          <Link to={`/${artist.slug}/blog`} className="text-[12px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100">
            ← All posts
          </Link>
          {post.coverUrl && (
            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <img src={post.coverUrl} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
            </div>
          )}
          {post.tag && (
            <p className="mt-8 text-[11px] uppercase tracking-[0.28em]" style={{ color: artist.accent }}>
              {post.tag}
            </p>
          )}
          <h1
            className="mt-3 font-bold leading-[1.05] tracking-tight"
            style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(34px, 6vw, 56px)" }}
          >
            {post.title}
          </h1>
          <p className="mt-4 text-[13px] opacity-60">
            {new Date(post.publishedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} · {post.readTime}
          </p>
          <div className="mt-10 space-y-5 text-[17px] leading-[1.75] text-white/85">
            {post.body.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <ArtistDisclaimers artist={artist} className="mt-12 pt-6 border-t border-white/10" />
        </article>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />
      <section
        className="px-6 pt-16 pb-12 text-center"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: artist.accent }}>The {artist.displayName} Blog</p>
        <h1
          className="mt-3 font-bold"
          style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(40px, 8vw, 72px)" }}
        >
          Stories, features & dispatches
        </h1>
        {isAdmin && (
          <Link
            to={`/${artist.slug}/blog/manage`}
            className="inline-block mt-6 rounded-full px-5 py-2 text-[13px] font-semibold"
            style={{ background: artist.accent, color: "#000" }}
          >
            ✎ Manage posts
          </Link>
        )}
      </section>

      <div className="max-w-[820px] mx-auto px-6 py-14 space-y-4">
        {posts.length === 0 && <p className="opacity-60 text-center">No posts yet.</p>}
        {posts.map((p) => (
          <Link
            key={p.slug}
            to={`/${artist.slug}/blog/${p.slug}`}
            className="block overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            {p.coverUrl && (
              <div className="aspect-[16/9] overflow-hidden bg-white/5">
                <img src={p.coverUrl} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="p-6">
              {p.tag && (
                <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: artist.accent }}>{p.tag}</p>
              )}
              <h2 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{p.title}</h2>
              <p className="mt-2 text-[15px] opacity-75">{p.excerpt}</p>
              <p className="mt-3 text-[12px] opacity-50">
                {new Date(p.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {p.readTime}
              </p>
            </div>
          </Link>
        ))}
        <ArtistDisclaimers artist={artist} className="pt-6" />
      </div>
    </main>
  );
}
