import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "./ArtistSectionNav";

export default function ArtistBlogPage() {
  const { slug = "", postSlug } = useParams();
  const artist = ARTIST_ROSTER.find(
    (a) => a.slug === slug || (a.aliases ?? []).includes(slug),
  );

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Blog · UPLY`;
  }, [artist]);

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

  const posts = artist.posts ?? [];
  const post = postSlug ? posts.find((p) => p.slug === postSlug) : null;

  if (post) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <article className="max-w-[720px] mx-auto px-6 pt-14 pb-24">
          <Link to={`/${artist.slug}/blog`} className="text-[12px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100">
            ← All posts
          </Link>
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
      </section>

      <div className="max-w-[820px] mx-auto px-6 py-14 space-y-4">
        {posts.length === 0 && <p className="opacity-60 text-center">No posts yet.</p>}
        {posts.map((p) => (
          <Link
            key={p.slug}
            to={`/${artist.slug}/blog/${p.slug}`}
            className="block rounded-2xl p-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            {p.tag && (
              <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: artist.accent }}>{p.tag}</p>
            )}
            <h2 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{p.title}</h2>
            <p className="mt-2 text-[15px] opacity-75">{p.excerpt}</p>
            <p className="mt-3 text-[12px] opacity-50">
              {new Date(p.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {p.readTime}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
