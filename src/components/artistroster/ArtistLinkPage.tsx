import { ARTIST_ROSTER, type ArtistRosterEntry, type SocialKind } from "@/data/artistRoster";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  Instagram, Youtube, Music2, Mail, Globe, Facebook, ExternalLink, Sparkles, Send,
  BookOpen, Users, GraduationCap,
} from "lucide-react";
import ArtistSectionNav from "./ArtistSectionNav";

const ICONS: Record<SocialKind, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  spotify: Music2,
  apple_music: Music2,
  soundcloud: Music2,
  tiktok: Music2,
  facebook: Facebook,
  threads: Send,
  website: Globe,
  email: Mail,
};

const ACCENT_BG: Record<SocialKind, string> = {
  instagram: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  youtube: "bg-[#FF0000]",
  spotify: "bg-[#1DB954]",
  apple_music: "bg-gradient-to-br from-[#FA243C] to-[#FB5C74]",
  soundcloud: "bg-[#FF5500]",
  tiktok: "bg-black",
  facebook: "bg-[#1877F2]",
  threads: "bg-black",
  website: "bg-[#3D7CFF]",
  email: "bg-[#6B7280]",
};

/**
 * Generic link-in-bio page rendered for any artist in ARTIST_ROSTER.
 * Mirrors the Arya XO layout pattern but driven entirely from data.
 */
export default function ArtistLinkPage({ slug }: { slug?: string }) {
  // Resolve from prop OR from the URL pathname (e.g. /omid, /andy)
  const resolvedSlug = (slug ?? (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "")) || "";
  const artist: ArtistRosterEntry | undefined = ARTIST_ROSTER.find(
    (a) => a.slug === resolvedSlug || (a.aliases ?? []).includes(resolvedSlug),
  );

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Official Links · UPLY`;
  }, [artist]);

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
        <div>
          <p className="opacity-60">Artist not found.</p>
          <Link to="/" className="underline text-[#00FF85] mt-2 inline-block">Back to UPLY</Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)`,
      }}
    >
      <ArtistSectionNav artist={artist} />
      <div className="max-w-md mx-auto px-5 pt-10 pb-24">
        {/* Header */}
        <header className="text-center mb-8">
          <p
            className="text-[11px] tracking-[0.22em] uppercase mb-3"
            style={{ color: artist.accent }}
          >
            {artist.eyebrow}
          </p>
          <h1
            className="font-bold leading-[0.95] tracking-tight"
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              fontSize: "clamp(40px, 11vw, 64px)",
            }}
          >
            {artist.displayName}
            {artist.verified && (
              <span className="inline-block align-middle ml-2 text-base" style={{ color: artist.accent }}>
                ✓
              </span>
            )}
          </h1>
          <p className="mt-3 text-[14px] opacity-80 leading-relaxed">{artist.tagline}</p>
          {artist.location && (
            <p className="mt-1 text-[11px] opacity-50 uppercase tracking-wider">{artist.location}</p>
          )}
        </header>

        {/* Featured site CTA */}
        <Link
          to={`/${artist.slug}-site`}
          className="block mb-4 rounded-2xl p-4 border bg-white/5 hover:bg-white/10 transition-colors"
          style={{ borderColor: `${artist.accent}55` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${artist.accent}, ${artist.accent}80)` }}
            >
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px]">Visit the official site</div>
              <div className="text-[12px] opacity-70 truncate">Bio · music · bookings</div>
            </div>
            <ExternalLink className="w-4 h-4 opacity-50" />
          </div>
        </Link>

        {/* Social links */}
        <div className="space-y-3">
          {artist.socials.map((s) => {
            const Icon = ICONS[s.kind];
            return (
              <a
                key={s.kind + s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors active:scale-[0.99]"
              >
                <div className={`w-11 h-11 rounded-xl ${ACCENT_BG[s.kind]} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[15px] truncate">{s.label}</div>
                  {s.sub && <div className="text-[12px] opacity-65 truncate">{s.sub}</div>}
                </div>
                <ExternalLink className="w-4 h-4 opacity-40" />
              </a>
            );
          })}

          {artist.bookingEmail && (
            <a
              href={`mailto:${artist.bookingEmail}?subject=Booking inquiry for ${artist.displayName}`}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors active:scale-[0.99]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#6B7280] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] truncate">Bookings & Press</div>
                <div className="text-[12px] opacity-65 truncate">{artist.bookingEmail}</div>
              </div>
              <ExternalLink className="w-4 h-4 opacity-40" />
            </a>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] opacity-50 hover:opacity-90"
          >
            <span style={{ color: artist.accent }}>●</span> Powered by UPLY
          </Link>
        </footer>
      </div>
    </main>
  );
}
