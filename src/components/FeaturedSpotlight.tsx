import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, BadgeCheck, Clock } from "lucide-react";
import portraitAsset from "@/assets/arya-xo-portrait-v3.jpg.asset.json";

/**
 * Curated platform-wide spotlight. Right now this leads with the Arya XO
 * feature blog so it surfaces on the landing page, the dashboard/discover
 * feeds, and anywhere else the platform wants to highlight launch-worthy
 * editorial. Designed to be the single source of truth for "what UPLY is
 * featuring this week" — update the entries array to roll a new feature.
 */

interface FeaturedEntry {
  id: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  image: string;
  href: string;
  badge?: string;
  meta?: string;
  verified?: boolean;
  cta: string;
  /** Related links to keep the artist's surface area discoverable */
  related?: { label: string; href: string }[];
}

export const FEATURED_ENTRIES: FeaturedEntry[] = [
  {
    id: "arya-xo-150-bands",
    eyebrow: "The Come-Up · Feature",
    title: "Twenty-two, and writing his own lane",
    excerpt:
      "How Arya XO went from late-night Vegas sessions to a HUGEL × NBA YoungBoy record — an Afrohouse / Latin house / hip-hop study in betting on yourself.",
    image: portraitAsset.url,
    href: "/arya-xo/blog",
    badge: "New",
    meta: "8 min read",
    verified: true,
    cta: "Read the feature",
    related: [
      { label: "Artist site", href: "/arya-xo-site" },
      { label: "All links", href: "/arya-xo" },
      { label: "Track: 150 Bands", href: "/arya-xo/blog/150-bands" },
    ],
  },
];

interface Props {
  variant?: "landing" | "feed";
  className?: string;
}

export default function FeaturedSpotlight({ variant = "landing", className = "" }: Props) {
  const entry = FEATURED_ENTRIES[0];
  if (!entry) return null;

  const isFeed = variant === "feed";

  return (
    <section
      aria-labelledby="featured-spotlight-heading"
      className={`relative ${isFeed ? "px-4 py-6" : "px-4 sm:px-6 py-12 sm:py-16"} ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2
            id="featured-spotlight-heading"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Featured on UPLY
          </h2>
        </div>

        <Link
          to={entry.href}
          aria-label={`${entry.cta}: ${entry.title}`}
          className="group relative block overflow-hidden rounded-2xl border border-border bg-card/60 transition-all duration-300 hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-0">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[360px] overflow-hidden">
              <img
                src={entry.image}
                alt={`Portrait of ${entry.title.split(",")[0]}`}
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent md:bg-gradient-to-r"
              />
              {entry.badge && (
                <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-accent-green px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-background shadow-lg">
                  {entry.badge}
                </span>
              )}
            </div>

            <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                {entry.eyebrow}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                {entry.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {entry.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {entry.verified && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <BadgeCheck className="w-3.5 h-3.5 fill-primary/20" />
                    Verified artist
                  </span>
                )}
                {entry.meta && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {entry.meta}
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                {entry.cta}
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        {entry.related && entry.related.length > 0 && (
          <nav
            aria-label={`More from ${entry.title.split(",")[0]}`}
            className="mt-4 flex flex-wrap gap-2"
          >
            {entry.related.map((r) => (
              <Link
                key={r.href}
                to={r.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {r.label}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
