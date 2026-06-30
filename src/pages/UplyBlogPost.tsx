import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import BlogShareBar from "@/components/BlogShareBar";
import { UPLY_BLOG_POSTS, getUplyBlogPost } from "@/data/uplyBlogPosts";

/**
 * Split a headline into two clauses so we can render the second half in
 * italic gold (editorial magazine style). Prefers a comma/em-dash break;
 * falls back to a midpoint split on a space near 55%.
 */
function splitHeadline(title: string): [string, string] {
  const breakers = [" — ", " – ", ", ", ": "];
  for (const b of breakers) {
    const idx = title.indexOf(b);
    if (idx > 6 && idx < title.length - 6) {
      const sep = b.trimEnd();
      return [title.slice(0, idx) + sep, title.slice(idx + b.length)];
    }
  }
  const target = Math.floor(title.length * 0.55);
  const space = title.indexOf(" ", target);
  if (space > 0) return [title.slice(0, space), title.slice(space + 1)];
  return [title, ""];
}

/** Derive a short ALL-CAPS eyebrow (≤ 18 chars) from the category. */
function deriveEyebrow(category: string): string {
  const map: Record<string, string> = {
    "The Operating System": "The Operating System",
    Monetization: "The Money",
    "The Industry": "The Industry",
  };
  return (map[category] ?? category).toUpperCase();
}

/**
 * UPLY blog post detail. Route: /blog/:slug
 * Falls back to the blog index if the slug is unknown.
 */
export default function UplyBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getUplyBlogPost(slug) : undefined;
  if (!post) return <Navigate to="/blog" replace />;

  const related = UPLY_BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const [headLead, headTail] = splitHeadline(post.title);
  const eyebrow = deriveEyebrow(post.category);
  const year = new Date(post.date).getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={`${post.title} — UPLY`}
        description={post.excerpt}
        canonicalUrl={`https://uply.tv/blog/${post.slug}`}
        image={post.cover}
        type="article"
      />

      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center justify-between">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold focus-visible:text-gold focus:outline-none transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> UPLY Blog
          </Link>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {post.category}
          </span>
        </div>
      </div>

      {/* Editorial hero — matches the ARYAXO feature layout */}
      <header className="relative">
        <div className="mx-auto max-w-3xl px-5 pt-8 sm:pt-12 pb-10">
          {/* Wordmark row */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div
              className="text-2xl sm:text-3xl font-black tracking-tight leading-none"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              <span className="text-foreground">UPL</span>
              <span className="text-gold">Y</span>
            </div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-muted-foreground text-right">
              <span className="text-gold">Feature</span>
              <span className="mx-2 opacity-50">·</span>
              <span>{year}</span>
            </div>
          </div>

          {/* Framed portrait with overlapping gold caption tag */}
          <figure className="relative">
            <div className="border-editorial overflow-hidden rounded-2xl aspect-[4/5] sm:aspect-[16/12] bg-card">
              <img
                src={post.cover}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="absolute left-4 -bottom-3 sm:left-6 sm:-bottom-4">
              <span className="inline-flex items-center bg-gold px-3.5 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--gold-foreground))] shadow-[0_8px_24px_-10px_hsl(var(--gold)/0.7)]">
                {post.author.replace(/^The\s+/i, "").replace(/\s+Desk$/i, "")} · {year}
              </span>
            </figcaption>
          </figure>

          {/* Eyebrow + split serif headline */}
          <div className="mt-10 sm:mt-12">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-gold">
              {eyebrow}
            </p>
            <h1
              className="mt-4 font-semibold tracking-tight leading-[1.02] text-[2.6rem] sm:text-6xl text-foreground"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              {headLead}
              {headTail && (
                <>
                  {" "}
                  <span className="italic text-gold font-normal block sm:inline">
                    {headTail}
                  </span>
                </>
              )}
            </h1>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {post.subtitle}
            </p>

            <div className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              <span>{post.author}</span>
              <span aria-hidden className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {post.readMinutes} min
              </span>
            </div>

            <div className="mt-6">
              <BlogShareBar
                url={`https://uply.tv/blog/${post.slug}`}
                title={post.title}
                excerpt={post.excerpt}
              />
            </div>
          </div>
        </div>

        {/* Gold hairline divider into the body */}
        <div
          className="mx-auto max-w-3xl h-px"
          style={{ background: "var(--section-divider)" }}
          aria-hidden
        />
      </header>


      {/* Article body */}
      <article className="mx-auto max-w-2xl px-5 py-10 sm:py-14 space-y-8">
        {post.sections.map((section, i) => (
          <section key={i} className="space-y-4">
            {section.heading && (
              <h2
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                {section.heading}
              </h2>
            )}
            {section.paragraphs?.map((p, idx) => (
              <p key={idx} className="text-[15px] sm:text-base leading-relaxed text-foreground/90">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="space-y-2 pl-1">
                {section.list.map((li, idx) => (
                  <li
                    key={idx}
                    className="relative pl-5 text-[15px] sm:text-base leading-relaxed text-foreground/90 before:absolute before:left-0 before:top-[0.65em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary"
                  >
                    {li}
                  </li>
                ))}
              </ul>
            )}
            {section.pullquote && (
              <blockquote
                className="border-l-2 border-gold-hairline pl-5 py-2 italic text-xl sm:text-2xl text-foreground/95"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                {section.pullquote}
              </blockquote>
            )}
          </section>
        ))}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {post.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-border bg-card/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="pt-6 border-t border-border space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Share this article
          </p>
          <BlogShareBar
            url={`https://uply.tv/blog/${post.slug}`}
            title={post.title}
            excerpt={post.excerpt}
          />
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section
          aria-label="Keep reading"
          className="mx-auto max-w-5xl px-5 pb-16"
        >
          <h2
            className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            Keep reading
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="group block overflow-hidden rounded-xl border border-border bg-card/40 hover:border-gold-hairline hover:shadow-[0_10px_30px_-12px_hsl(var(--gold)/0.45)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-[hsl(var(--gold)/0.7)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={r.cover}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary group-hover:text-gold transition-colors font-semibold mb-1">
                    {r.category}
                  </p>
                  <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                    {r.title}
                  </h3>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:text-gold transition-colors">
                    Read <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
