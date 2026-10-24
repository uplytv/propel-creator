import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import { BadgeCheck, ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/posthog";
import { resolveCreatorDestination } from "@/lib/resolveCreatorDestination";

/**
 * Marketing landing section showcasing featured creators on UPLY.
 * Each card keeps a static href to the roster-backed social profile at
 * /@<handle> (sane middle-click / new-tab), while plain left-clicks resolve
 * the best live destination (community → profile → site → blog → /roster)
 * via resolveCreatorDestination so a card never lands on a dead end.
 * Cards can be filtered client-side by creator type (Singer, DJ, …).
 */
export default function FeaturedCreatorsSection() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const types = useMemo(() => {
    const unique = new Set<string>();
    ARTIST_ROSTER.forEach((a) => {
      if (a.creatorType) unique.add(a.creatorType);
    });
    return ["All", ...Array.from(unique)];
  }, []);

  const visible =
    typeFilter === "All"
      ? ARTIST_ROSTER
      : ARTIST_ROSTER.filter((a) => a.creatorType === typeFilter);

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
            Open a creator’s page to see what they sell — membership, tickets, or a live show.
          </p>
        </div>

        {types.length > 2 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(t);
                  trackEvent("landing_featured_creators_type_filter", {
                    surface: "landing_featured_creators",
                    type: t,
                  });
                }}
                aria-pressed={typeFilter === t}
                className={`px-3 py-1.5 rounded-none text-xs font-medium whitespace-nowrap transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-semibold text-foreground">No creators in this category yet</p>
            <button
              type="button"
              onClick={() => setTypeFilter("All")}
              className="mt-3 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Show all creators
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {visible.map((a, index) => (
            <Link
              key={a.slug}
              to={`/@${a.slug}`}
              aria-label={`Visit ${a.displayName} on UPLY`}
              onPointerEnter={() => void resolveCreatorDestination(a.slug)}
              onClick={(e) => {
                trackEvent("landing_featured_creator_clicked", {
                  surface: "landing_featured_creators",
                  slug: a.slug,
                  handle: `@${a.slug}`,
                  display_name: a.displayName,
                  position: index + 1,
                  destination: `/@${a.slug}`,
                });
                // Let middle-click / modified clicks use the static href.
                if (
                  e.defaultPrevented ||
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                ) {
                  return;
                }
                e.preventDefault();
                void resolveCreatorDestination(a.slug).then((dest) => navigate(dest));
              }}
              className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:-translate-y-1 bg-white/5"
              style={{
                background: `linear-gradient(160deg, ${a.gradient.from}, ${a.gradient.to})`,
              }}
            >
              {a.creatorType && (
                <span className="absolute top-2 left-2 z-10 rounded-none bg-black/60 backdrop-blur-sm border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {a.creatorType}
                </span>
              )}
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
        )}

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
