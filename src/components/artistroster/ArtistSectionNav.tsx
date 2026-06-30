import { Link, useLocation } from "react-router-dom";
import type { ArtistRosterEntry } from "@/data/artistRoster";
import BackButton from "@/components/common/BackButton";


/**
 * Shared sticky sub-nav for every artist surface (hub, site, blog,
 * community, courses). Keeps a consistent IA so all sections feel like
 * one unified product on UPLY.
 */
export default function ArtistSectionNav({ artist }: { artist: ArtistRosterEntry }) {
  const { pathname } = useLocation();
  const base = `/${artist.slug}`;
  const items: { label: string; href: string; match: (p: string) => boolean }[] = [
    { label: "Links", href: base, match: (p) => p === base || p === `${base}/` },
    { label: "Site", href: `${base}-site`, match: (p) => p === `${base}-site` },
    ...(artist.posts?.length ? [{ label: "Blog", href: `${base}/blog`, match: (p: string) => p.startsWith(`${base}/blog`) }] : []),
    ...(artist.community ? [{ label: "Community", href: `${base}/community`, match: (p: string) => p.startsWith(`${base}/community`) }] : []),
    ...(artist.courses?.length ? [{ label: "Courses", href: `${base}/courses`, match: (p: string) => p.startsWith(`${base}/courses`) }] : []),
    { label: "Account", href: `${base}/account`, match: (p: string) => p === `${base}/account` || p === `${base}/signin` },
  ];

  return (
    <nav
      aria-label={`${artist.displayName} sections`}
      className="sticky top-0 z-40 backdrop-blur-xl bg-black/55 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar h-12">
        <Link
          to="/roster"
          className="text-[11px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 px-2 shrink-0"
        >
          ← Roster
        </Link>
        <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              to={it.href}
              className={`shrink-0 px-3 h-8 inline-flex items-center rounded-full text-[12px] font-semibold transition-colors ${
                active ? "text-black" : "text-white/75 hover:text-white"
              }`}
              style={active ? { background: artist.accent } : undefined}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
