import { ARTIST_ROSTER, type ArtistRosterEntry, type SocialKind } from "@/data/artistRoster";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  Instagram, Youtube, Music2, Mail, Globe, Facebook, ExternalLink, Send, Play,
} from "lucide-react";

const ICONS: Record<SocialKind, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram, youtube: Youtube, spotify: Music2, apple_music: Music2,
  soundcloud: Music2, tiktok: Music2, facebook: Facebook, threads: Send,
  website: Globe, email: Mail,
};

/**
 * Generic editorial artist site rendered for any artist in ARTIST_ROSTER.
 * Route: /:slug-site (e.g. /omid-site).
 * Designed to be a one-page press kit: hero → bio → music → socials → booking.
 */
export default function ArtistSitePage({ slug }: { slug?: string }) {
  const resolvedSlug =
    (slug ?? (typeof window !== "undefined" ? window.location.pathname.split("/")[1].replace(/-site$/, "") : "")) || "";
  const artist: ArtistRosterEntry | undefined = ARTIST_ROSTER.find(
    (a) => a.slug === resolvedSlug || (a.aliases ?? []).includes(resolvedSlug),
  );

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Official Site · UPLY`;
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

  const bioParas = artist.bio.split("\n\n");

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* HERO */}
      <section
        className="relative isolate overflow-hidden"
        style={{
          background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background: `radial-gradient(40% 60% at 80% 100%, ${artist.accent}22, transparent 70%)`,
          }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6 pt-20 pb-20 sm:pt-28 sm:pb-28 text-center">
          <p
            className="text-[12px] tracking-[0.28em] uppercase mb-5"
            style={{ color: artist.accent }}
          >
            {artist.eyebrow}
          </p>
          <h1
            className="font-bold tracking-tight"
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              fontSize: "clamp(56px, 14vw, 156px)",
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
            }}
          >
            {artist.displayName}
          </h1>
          <p className="mt-6 text-lg sm:text-xl opacity-85 max-w-2xl mx-auto leading-relaxed">
            {artist.tagline}
          </p>

          {/* Quick social pills */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
            {artist.socials.slice(0, 5).map((s) => {
              const Icon = ICONS[s.kind];
              return (
                <a
                  key={s.kind + s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </a>
              );
            })}
            <Link
              to={`/${artist.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
              style={{ background: artist.accent, color: "#0a0a0a" }}
            >
              All links
            </Link>
          </div>

          {artist.location && (
            <p className="mt-8 text-[11px] uppercase tracking-[0.25em] opacity-50">
              {artist.location}
            </p>
          )}
        </div>
      </section>

      {/* BIO */}
      <section className="max-w-[760px] mx-auto px-6 py-20">
        <h2 className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: artist.accent }}>
          About
        </h2>
        <div className="space-y-5 text-[17px] leading-[1.75] text-white/85">
          {bioParas.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* MUSIC / VIDEOS */}
      {artist.videos && artist.videos.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 pb-20">
          <h2 className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: artist.accent }}>
            Latest
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {artist.videos.map((v, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                {v.youtubeId ? (
                  <div className="relative aspect-video bg-black">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${v.youtubeId}`}
                      title={v.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : v.instagramUrl ? (
                  <a
                    href={v.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-center p-6 hover:opacity-90 transition-opacity"
                  >
                    <div>
                      <Play className="w-10 h-10 mx-auto mb-3 opacity-90" />
                      <div className="font-semibold">Watch on Instagram</div>
                      <div className="text-[12px] opacity-80 mt-1">@{artist.socials.find((s) => s.kind === "instagram")?.handle ?? artist.slug}</div>
                    </div>
                  </a>
                ) : null}
                <div className="p-4">
                  <div className="font-medium text-[15px]">{v.title}</div>
                  {v.caption && <div className="text-[13px] opacity-65 mt-1">{v.caption}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SPOTIFY EMBED */}
      {artist.spotifyArtistEmbedId && (
        <section className="max-w-[760px] mx-auto px-6 pb-20">
          <h2 className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: artist.accent }}>
            On Spotify
          </h2>
          <iframe
            className="rounded-2xl w-full"
            src={`https://open.spotify.com/embed/artist/${artist.spotifyArtistEmbedId}?theme=0`}
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </section>
      )}

      {/* SOCIALS GRID */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <h2 className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: artist.accent }}>
          Follow
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {artist.socials.map((s) => {
            const Icon = ICONS[s.kind];
            return (
              <a
                key={s.kind + s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Icon className="w-5 h-5" style={{ color: artist.accent }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px] truncate">{s.label}</div>
                  {s.sub && <div className="text-[11px] opacity-60 truncate">{s.sub}</div>}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* BOOKING */}
      {artist.bookingEmail && (
        <section className="max-w-[760px] mx-auto px-6 pb-24 text-center">
          <h2 className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: artist.accent }}>
            Bookings & Press
          </h2>
          <p className="text-white/75 mb-6">
            Booking, sync licensing, and press inquiries are handled directly through UPLY.
          </p>
          <a
            href={`mailto:${artist.bookingEmail}?subject=Inquiry for ${artist.displayName}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-transform hover:scale-[1.02]"
            style={{ background: artist.accent, color: "#0a0a0a" }}
          >
            <Mail className="w-4 h-4" />
            {artist.bookingEmail}
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 text-center">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-[0.25em] opacity-50 hover:opacity-90"
        >
          <span style={{ color: artist.accent }}>●</span> Powered by UPLY
        </Link>
      </footer>
    </main>
  );
}
