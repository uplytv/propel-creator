import { Link } from "react-router-dom";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { UPLY_BLOG_POSTS } from "@/data/uplyBlogPosts";

/**
 * UPLY blog index. Lists every editorial post in `uplyBlogPosts.ts`.
 * Route: /blog
 */
export default function UplyBlog() {
  const [hero, ...rest] = UPLY_BLOG_POSTS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="UPLY Blog — How creators run their whole career on one platform"
        description="Long-form writing from the UPLY desk on monetization, PPV events, the creator OS, and the six platforms UPLY replaces."
        canonicalUrl="https://uply.tv/blog"
      />

      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> The UPLY Desk
          </div>
          <h1
            className="mt-4 font-extrabold tracking-tight leading-[1.05] text-4xl sm:text-5xl"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            The Creator OS, explained.
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">
            How working artists, filmmakers, teachers, and influencers actually use UPLY — and why
            keeping ninety-five percent of your money changes the math.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 space-y-10">
        {/* Hero post */}
        {hero && (
          <Link
            to={`/blog/${hero.slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-border bg-card/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="grid md:grid-cols-2">
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px]">
                <img
                  src={hero.cover}
                  alt=""
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent md:bg-gradient-to-r" />
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">
                  {hero.category}
                </p>
                <h2
                  className="text-2xl sm:text-3xl font-bold leading-tight"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {hero.title}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {hero.excerpt}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{hero.author}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {hero.readMinutes} min read
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-2 group-hover:gap-2.5 transition-all">
                  Read the feature <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Grid of remaining posts */}
        {rest.length > 0 && (
          <section aria-label="All posts" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card/40 hover:border-primary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={post.cover}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
                  <span className="absolute top-3 left-3 inline-flex items-center rounded-md bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {post.category}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3
                    className="text-base font-bold leading-snug"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary font-semibold">
                      Read <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
