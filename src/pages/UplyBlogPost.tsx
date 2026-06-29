import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import BlogShareBar from "@/components/BlogShareBar";
import { UPLY_BLOG_POSTS, getUplyBlogPost } from "@/data/uplyBlogPosts";

/**
 * UPLY blog post detail. Route: /blog/:slug
 * Falls back to the blog index if the slug is unknown.
 */
export default function UplyBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getUplyBlogPost(slug) : undefined;
  if (!post) return <Navigate to="/blog" replace />;

  const related = UPLY_BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

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

      {/* Hero */}
      <header className="relative isolate overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-2xl opacity-30"
          style={{ backgroundImage: `url(${post.cover})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/90 to-background" />

        <div className="mx-auto max-w-3xl px-5 pt-12 pb-10 sm:pt-16 sm:pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-hairline bg-card/60 text-[10px] uppercase tracking-[0.25em] text-gold">
            <Sparkles className="h-3 w-3 text-gold" /> {post.category}
          </div>
          <h1
            className="mt-5 font-semibold tracking-tight leading-[1.02] text-4xl sm:text-6xl"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            {post.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {post.subtitle}
          </p>
          <p className="mt-5 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            <span>{post.author}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readMinutes} min
            </span>
          </p>

          <div className="mt-6 flex justify-center">
            <BlogShareBar
              url={`https://uply.tv/blog/${post.slug}`}
              title={post.title}
              excerpt={post.excerpt}
            />
          </div>

          <div className="border-editorial mt-8 mx-auto aspect-[16/9] w-full max-w-2xl rounded-2xl overflow-hidden">
            <img
              src={post.cover}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        </div>
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
