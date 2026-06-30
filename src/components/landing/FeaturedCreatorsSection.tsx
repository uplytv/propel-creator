import { Link } from "react-router-dom";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import { BadgeCheck, ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/posthog";

/**
 * Marketing landing section showcasing featured creators on UPLY.
 * Each card links to the roster-backed social profile at /@<handle>.
 */
export default function FeaturedCreatorsSection() {
  if (!ARTIST_ROSTER?.length) return null;

  return (
    <section className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-10 md:mb-14 text-center">
          <p className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Featured creators
          </p>
          <h2 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-foreground">
            Artists building their universe on UPLY
          </h2>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Tap any creator to visit their UPLY profile — bio, links, drops, and
            community in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {ARTIST_ROSTER.map((a, index) => (
            <Link
              key={a.slug}
              to={`/@${a.slug}`}
              aria-label={`Visit ${a.displayName} on UPLY`}
              onClick={() =>
                trackEvent("landing_featured_creator_clicked", {
                  surface: "landing_featured_creators",
                  slug: a.slug,
                  handle: `@${a.slug}`,
                  display_name: a.displayName,
                  position: index + 1,
                  destination: `/@${a.slug}`,
                })
              }
              className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:-translate-y-1 bg-white/5"
              style={{
                background: `linear-gradient(160deg, ${a.gradient.from}, ${a.gradient.to})`,
              }}
            >
              <div className="aspect-[3/4] w-full overflow-hidden">
                {a.portraitUrl ? (
                  <img
                    src={a.portraitUrl}
                    alt={a.displayName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-black opacity-60">
                    {a.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base md:text-lg text-white truncate">
                    {a.displayName}
                  </span>
                  {a.verified && (
                    <BadgeCheck
                      className="w-4 h-4 shrink-0"
                      style={{ color: a.accent }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] md:text-xs text-white/70 truncate">
                    @{a.slug}
                  </span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/roster"
            onClick={() =>
              trackEvent("landing_featured_creators_view_all_clicked", {
                surface: "landing_featured_creators",
                destination: "/roster",
                roster_size: ARTIST_ROSTER.length,
              })
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            View the full UPLY roster →
          </Link>
        </div>
      </div>
    </section>
  );
}
