import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { UPLY_BLOG_POSTS } from "@/data/uplyBlogPosts";

/**
 * UPLY blog index. Lists every editorial post in `uplyBlogPosts.ts`.
 * Route: /blog
 */
export default function UplyBlog() {
  const [hero, ...rest] = UPLY_BLOG_POSTS;
  const year = hero ? new Date(hero.date).getFullYear() : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="UPLY Blog — How creators run their whole career on one platform"
        description="Long-form writing from the UPLY desk on monetization, PPV events, the creator OS, and the six platforms UPLY replaces."
        canonicalUrl="https://uply.tv/blog"
      />

      {/* Editorial masthead */}
      <header className="border-b border-gold-hairline">
        <div className="mx-auto max-w-6xl px-5 pt-10 sm:pt-14 pb-10 sm:pb-14">
          <div className="flex items-end justify-between gap-4 mb-6">
            <Link to="/" className="wordmark-uply text-2xl sm:text-3xl" aria-label="UPLY">
              <span>UPL</span>
              <span className="accent">Y</span>
            </Link>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-muted-foreground text-right">
              <span className="text-gold">The UPLY Desk</span>
              <span className="mx-2 opacity-50">·</span>
              <span>{year}</span>
            </div>
          </div>

          <p className="eyebrow-gold">Editorial</p>
          <h1 className="mt-4 type-display-xl text-foreground">
            The Creator OS,{" "}
            <span className="italic text-gold font-normal">explained.</span>
          </h1>
          <p className="mt-5 type-body-lg text-muted-foreground max-w-2xl">
            How working artists, filmmakers, teachers, and influencers actually use
            UPLY — and why keeping ninety-five percent of your money changes the math.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14 space-y-12">
        {/* Hero feature */}
        {hero && (
          <Link
            to={`/blog/${hero.slug}`}
            className="card-editorial group relative block rounded-2xl overflow-hidden focus:outline-none"
          >
            <div className="grid md:grid-cols-2">
              <figure className="relative aspect-[16/10] md:aspect-auto md:min-h-[360px] overflow-hidden">
                <img
                  src={hero.cover}
                  alt=""
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent md:bg-gradient-to-r"
                />
                <figcaption className="absolute left-4 bottom-4">
                  <span className="inline-flex items-center bg-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--gold-foreground))] shadow-[0_8px_24px_-10px_hsl(var(--gold)/0.7)]">
                    Feature · {new Date(hero.date).getFullYear()}
                  </span>
                </figcaption>
              </figure>
              <div className="p-6 sm:p-10 flex flex-col justify-center gap-3">
                <p className="eyebrow-gold">{hero.category}</p>
                <h2 className="type-display-lg text-foreground">{hero.title}</h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {hero.excerpt}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{hero.author}</span>
                  <span aria-hidden className="opacity-50">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {hero.readMinutes} min read
                  </span>
                </div>
                <span className="link-gold inline-flex items-center gap-1.5 text-sm font-semibold mt-3 w-fit">
                  Read the feature
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* All posts grid */}
        {rest.length > 0 && (
          <section aria-label="All posts" className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <h2 className="type-display-md text-foreground">More from the desk</h2>
              <div
                className="hidden sm:block flex-1 h-px"
                style={{ background: "var(--section-divider)" }}
                aria-hidden
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="card-editorial group flex flex-col rounded-xl focus:outline-none"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={post.cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent"
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center bg-gold px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--gold-foreground))]">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h3
                      className="text-lg font-semibold leading-snug text-foreground"
                      style={{ fontFamily: "Fraunces, Georgia, serif" }}
                    >
                      {post.title}
                    </h3>
                    <p className="text-[13px] text-muted-foreground line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground border-t border-border/60">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readMinutes} min
                      </span>
                      <span className="link-gold inline-flex items-center gap-1 font-semibold">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
