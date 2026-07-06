import { Link } from "react-router-dom";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import { BadgeCheck } from "lucide-react";

/**
 * Featured Artists rail — surfaces the curated UPLY roster
 * (Omid, Morvarid, Andy, …) directly in the Discover experience
 * so users find them without needing to search.
 */
export default function RosterArtistsRail() {
  if (!ARTIST_ROSTER?.length) return null;

  return (
    <section className="space-y-3">
      <div className="px-4 md:px-8 flex items-end justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight">
            ⭐ Featured Artists on UPLY
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Managed artists — links, sites, blogs, communities & courses
          </p>
        </div>
        <Link to="/roster" className="text-xs md:text-sm font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>

      <div className="flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-8 pb-2 snap-x snap-mandatory">
        {ARTIST_ROSTER.map((a) => (
          <Link
            key={a.slug}
            to={`/${a.slug}`}
            className="group relative shrink-0 w-[160px] md:w-[200px] snap-start rounded-xl overflow-hidden bg-card border border-border hover:border-foreground/30 transition-colors"
          >
            <div className="aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30">
              {a.portraitUrl ? (
                <img
                  src={a.portraitUrl}
                  alt={a.displayName}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-foreground/60">
                  {a.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm md:text-base truncate">{a.displayName}</span>
                {a.verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-1">
                {a.eyebrow}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
