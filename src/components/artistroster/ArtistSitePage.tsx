import { ARTIST_ROSTER, type ArtistRosterEntry, type SocialKind } from "@/data/artistRoster";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Instagram, Youtube, Music2, Mail, Globe, Facebook, Send, Play,
  Sparkles, ArrowRight, MapPin, Calendar, DollarSign, Users,
  Check, Share2, Copy, X,
} from "lucide-react";
import ArtistSectionNav from "./ArtistSectionNav";

const ICONS: Record<SocialKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  instagram: Instagram, youtube: Youtube, spotify: Music2, apple_music: Music2,
  soundcloud: Music2, tiktok: Music2, facebook: Facebook, threads: Send,
  website: Globe, email: Mail,
};


/**
 * Editorial artist site, rendered for any artist in ARTIST_ROSTER.
 * Route: /:slug-site (e.g. /omid-site).
 *
 * Sections (each renders only if data is present):
 *   1. Sticky in-page nav + share modal
 *   2. Cinematic hero (gradient + portrait + CTAs + marquee)
 *   3. Releases grid
 *   4. Videos grid
 *   5. Featured blog cross-link
 *   6. About + milestones timeline + stat cards
 *   7. Booking section (info cards + mailto CTA)
 *   8. Spotify embed
 *   9. Socials grid
 *  10. Footer
 *
 * Per-artist branding is driven entirely by `gradient`/`accent` — no
 * hardcoded brand colors. Data shape lives in src/data/artistRoster.ts.
 */
export default function ArtistSitePage({ slug }: { slug?: string }) {
  const resolvedSlug =
    (slug ?? (typeof window !== "undefined" ? window.location.pathname.split("/")[1].replace(/-site$/, "") : "")) || "";
  const artist: ArtistRosterEntry | undefined = ARTIST_ROSTER.find(
    (a) => a.slug === resolvedSlug || (a.aliases ?? []).includes(resolvedSlug),
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Official Site · UPLY`;
  }, [artist]);

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
        <div>
          <p className="opacity-60">Artist not found.</p>
          <Link to="/" className="underline text-primary mt-2 inline-block">Back to UPLY</Link>
        </div>
      </main>
    );
  }

  const bioParas = artist.bio.split("\n\n");
  const featuredPost = artist.posts?.find((p) => p.slug === artist.featuredPostSlug) ?? artist.posts?.[0];
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  const sections: { id: string; label: string }[] = [
    artist.releases?.length ? { id: "music", label: "Music" } : null,
    artist.videos?.length ? { id: "videos", label: "Videos" } : null,
    featuredPost ? { id: "press", label: "Press" } : null,
    { id: "about", label: "About" },
    artist.bookingEmail ? { id: "booking", label: "Booking" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white selection:bg-white/20">
      <ArtistSectionNav artist={artist} />

      {/* In-page nav + share */}
      <nav className="sticky top-12 z-30 backdrop-blur-xl bg-black/55 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-5 h-12 flex items-center justify-between gap-3">
          <a href="#top" className="font-heading font-extrabold tracking-tight text-sm" style={{ color: artist.accent }}>
            {artist.displayName}
          </a>
          <div className="hidden sm:flex items-center gap-5 text-xs text-white/65">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="hover:text-white transition-colors">{s.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: artist.accent, color: "#0a0a0a" }}
              aria-label={`Share ${artist.displayName}`}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <Link
              to={`/${artist.slug}`}
              className="hidden sm:inline-flex items-center px-3 h-8 rounded-full text-[12px] font-semibold bg-white/10 hover:bg-white/15 border border-white/15"
            >
              Links
            </Link>
          </div>
        </div>
      </nav>

      {/* Share modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Share {artist.displayName}</h3>
              <button
                onClick={() => setShareOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10"
                aria-label="Close share dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-white/55 mb-2">Public link</p>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent text-sm px-2 py-2 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold"
                style={{ background: artist.accent, color: "#0a0a0a" }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(artist.displayName)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
              >X / Twitter</a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
              >Facebook</a>
              <a
                href={`sms:?&body=${encodeURIComponent(`${artist.displayName} — ${shareUrl}`)}`}
                className="inline-flex items-center justify-center px-3 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
              >Text</a>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <header
        id="top"
        className="relative isolate overflow-hidden"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: `radial-gradient(40% 60% at 80% 100%, ${artist.accent}22, transparent 70%)` }}
        />

        <div className={`relative mx-auto max-w-6xl px-5 pt-16 pb-16 sm:pt-24 sm:pb-24 grid ${artist.portraitUrl ? "sm:grid-cols-[1.1fr_1fr]" : ""} gap-10 items-center`}>
          <div className={artist.portraitUrl ? "" : "text-center mx-auto max-w-2xl"}>
            {artist.heroChip && (
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{ borderColor: `${artist.accent}55`, color: artist.accent, background: `${artist.accent}14` }}
              >
                <Sparkles className="h-3 w-3" /> {artist.heroChip}
              </div>
            )}
            <p
              className="mt-5 text-[11px] tracking-[0.28em] uppercase"
              style={{ color: artist.accent }}
            >
              {artist.eyebrow}
            </p>
            <h1
              className="mt-3 font-heading font-extrabold tracking-tight"
              style={{
                fontFamily: "Fraunces, Georgia, serif",
                fontSize: "clamp(52px, 12vw, 132px)",
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
              }}
            >
              {artist.displayName}
            </h1>
            <p className={`mt-5 text-base sm:text-lg text-white/80 max-w-xl ${artist.portraitUrl ? "" : "mx-auto"}`}>
              {artist.tagline}
            </p>

            <div className={`mt-7 flex flex-wrap gap-3 ${artist.portraitUrl ? "" : "justify-center"}`}>
              {artist.socials.slice(0, 2).map((s) => {
                const Icon = ICONS[s.kind];
                return (
                  <a
                    key={s.kind + s.href}
                    href={s.href}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-full font-semibold text-[14px] transition-transform hover:scale-[1.02]"
                    style={{ background: artist.accent, color: "#0a0a0a" }}
                  >
                    <Icon className="h-4 w-4" /> {s.label}
                  </a>
                );
              })}
              {artist.bookingEmail && (
                <a
                  href="#booking"
                  className="inline-flex items-center gap-2 px-5 h-11 rounded-full font-semibold text-[14px] bg-white/10 hover:bg-white/15 border border-white/15"
                >
                  <Mail className="h-4 w-4" /> Book
                </a>
              )}
            </div>

            {artist.location && (
              <p className={`mt-8 text-[11px] uppercase tracking-[0.25em] opacity-50 ${artist.portraitUrl ? "" : "text-center"}`}>
                {artist.location}
              </p>
            )}
          </div>

          {artist.portraitUrl && (
            <div className="relative mx-auto">
              <div
                className="absolute -inset-8 -z-10 rounded-full blur-3xl opacity-40"
                style={{ background: artist.accent }}
              />
              <div
                className="h-64 w-64 sm:h-[22rem] sm:w-[22rem] rounded-[2rem] overflow-hidden ring-1 ring-white/15"
                style={{ boxShadow: `0 40px 120px -30px ${artist.accent}88` }}
              >
                <img src={artist.portraitUrl} alt={artist.displayName} className="h-full w-full object-cover object-center" />
              </div>
            </div>
          )}
        </div>

        {/* Marquee */}
        {artist.marquee && artist.marquee.length > 0 && (
          <>
            <div className="border-y border-white/5 bg-black/40">
              <div className="overflow-hidden">
                <div className="flex gap-10 whitespace-nowrap py-3 animate-[roster-marquee_30s_linear_infinite] font-heading text-sm uppercase tracking-[0.25em] text-white/40">
                  {Array.from({ length: 2 }).flatMap((_, i) =>
                    artist.marquee!.map((t, j) => (
                      <span key={`${i}-${j}`} className="flex items-center gap-10">
                        {t}
                        <span style={{ color: artist.accent }}>✦</span>
                      </span>
                    )),
                  )}
                </div>
              </div>
            </div>
            <style>{`@keyframes roster-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
          </>
        )}
      </header>

      {/* RELEASES */}
      {artist.releases && artist.releases.length > 0 && (
        <section id="music" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>Discography</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Latest releases</h2>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artist.releases.map((r) => {
              const Wrap: any = r.href ? "a" : "div";
              const wrapProps = r.href ? { href: r.href, target: "_blank", rel: "noopener noreferrer" } : {};
              return (
                <Wrap
                  key={r.title}
                  {...wrapProps}
                  className="group relative overflow-hidden p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-colors"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/10 mb-4 relative">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt={r.title} className="h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="h-full w-full" style={{ background: `linear-gradient(160deg, ${artist.gradient.from}, ${artist.gradient.to})` }} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="h-14 w-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ background: artist.accent, color: "#0a0a0a", boxShadow: `0 12px 30px -10px ${artist.accent}` }}
                      >
                        <Play className="h-6 w-6 fill-current" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: artist.accent }}>
                    <Sparkles className="h-3 w-3" /> {r.tag ?? "Release"} · {r.year}
                  </div>
                  <div className="mt-1 font-heading text-xl font-bold">{r.title}</div>
                  {r.feat && <div className="text-xs text-white/55">{r.feat}</div>}
                </Wrap>
              );
            })}
          </div>
        </section>
      )}

      {/* VIDEOS */}
      {artist.videos && artist.videos.length > 0 && (
        <section id="videos" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>Watch</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Videos & reels</h2>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {artist.videos.map((v, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                {v.youtubeId ? (
                  <div className="relative aspect-video">
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
                    target="_blank" rel="noopener noreferrer"
                    className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-center p-6 hover:opacity-90 transition-opacity"
                  >
                    <div>
                      <Play className="w-10 h-10 mx-auto mb-3 opacity-90" />
                      <div className="font-semibold">Watch on Instagram</div>
                      <div className="text-[12px] opacity-80 mt-1">@{artist.socials.find((s) => s.kind === "instagram")?.handle ?? artist.slug}</div>
                    </div>
                  </a>
                ) : null}
                <div className="p-4 flex items-center justify-between">
                  <div className="font-medium text-[15px]">{v.title}</div>
                  {v.caption && <div className="text-[12px] text-white/55">{v.caption}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED PRESS */}
      {featuredPost && (
        <section id="press" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>Featured</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">{featuredPost.tag ?? "Latest story"}</h2>

          <Link
            to={`/${artist.slug}/blog/${featuredPost.slug}`}
            className="mt-8 group grid sm:grid-cols-[1.1fr_1.4fr] gap-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] hover:border-white/25 transition-colors"
          >
            <div
              className="aspect-[4/3] sm:aspect-auto overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${artist.gradient.from}, ${artist.gradient.to})` }}
            >
              {artist.portraitUrl && (
                <img
                  src={artist.portraitUrl}
                  alt={`${artist.displayName} feature`}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition duration-700"
                />
              )}
            </div>
            <div className="p-6 sm:p-10 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/50">
                {featuredPost.tag ?? "Feature"} · {featuredPost.readTime}
              </div>
              <h3 className="mt-3 font-heading text-2xl sm:text-4xl font-extrabold leading-[1.05]">
                {featuredPost.title}
              </h3>
              <p className="mt-4 text-white/70 text-[15px] leading-relaxed">{featuredPost.excerpt}</p>
              <div className="mt-6 inline-flex items-center gap-2 font-semibold text-sm" style={{ color: artist.accent }}>
                Read the feature <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ABOUT + MILESTONES */}
      <section id="about" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
        <div className={`grid ${artist.milestones?.length ? "sm:grid-cols-[1fr_1.2fr]" : ""} gap-10 items-start`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>About</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">The story so far</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-white/75">
              {bioParas.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          {artist.milestones && artist.milestones.length > 0 && (
            <ol className="relative border-l border-white/10 pl-6 space-y-6">
              {artist.milestones.map((m, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4"
                    style={{ background: artist.accent, boxShadow: `0 0 0 4px ${artist.accent}33` }}
                  />
                  <div className="text-[11px] uppercase tracking-wider text-white/50">
                    {m.age ? `Age ${m.age}` : m.year}
                  </div>
                  <div className="mt-1 font-heading text-lg font-bold">{m.text}</div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {artist.stats && artist.stats.length > 0 && (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {artist.stats.map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/55">{s.k}</div>
                <div className="mt-1 font-heading text-base font-bold">{s.v}</div>
              </div>
            ))}
          </div>
        )}

        {artist.gallery && artist.gallery.length > 0 && (
          <div className="mt-12">
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>Gallery</p>
            <h3 className="mt-2 font-heading text-2xl sm:text-3xl font-bold">Life behind the build</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artist.gallery.map((item) => (
                <figure key={item.url} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                  <img src={item.url} alt={item.alt} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                  {item.caption && <figcaption className="p-4 text-sm text-white/65">{item.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* BOOKING */}
      {artist.bookingEmail && (
        <section id="booking" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
          <div
            className="rounded-3xl p-6 sm:p-10 border"
            style={{
              borderColor: `${artist.accent}33`,
              background: `linear-gradient(140deg, ${artist.gradient.from}, ${artist.gradient.to})`,
            }}
          >
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>Direct booking</p>
                <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold leading-tight">
                  Book {artist.displayName} in 60 seconds.
                </h2>
                <p className="mt-3 text-white/75 max-w-md">
                  {artist.bookingTagline ?? "Booking, sync, and press inquiries handled directly by the team on UPLY."}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { Icon: MapPin, k: "Based in", v: artist.location ?? "Worldwide" },
                    { Icon: Calendar, k: "Availability", v: "Now booking 2026" },
                    { Icon: DollarSign, k: "Fee range", v: "Tiered — share your budget" },
                    { Icon: Users, k: "Welcome", v: "Festivals, clubs, private events" },
                  ].map(({ Icon, k, v }) => (
                    <div key={k} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <Icon className="h-4 w-4" style={{ color: artist.accent }} />
                      <div className="mt-2 font-semibold text-sm">{k}</div>
                      <div className="text-white/55 text-xs">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 flex flex-col justify-center">
                <h3 className="font-heading text-xl font-bold">Send an inquiry</h3>
                <p className="mt-2 text-sm text-white/70">
                  Your message lands directly in {artist.displayName}'s team inbox on UPLY. Expect a same-week reply.
                </p>
                <a
                  href={`mailto:${artist.bookingEmail}?subject=${encodeURIComponent(`Booking inquiry — ${artist.displayName}`)}`}
                  className="mt-6 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-semibold transition-transform hover:scale-[1.02]"
                  style={{ background: artist.accent, color: "#0a0a0a" }}
                >
                  <Mail className="h-4 w-4" /> {artist.bookingEmail}
                </a>
                <p className="mt-3 text-[11px] text-white/45 text-center">
                  Inquiries land inside UPLY. We never share your info.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SPOTIFY EMBED */}
      {artist.spotifyArtistEmbedId && (
        <section className="mx-auto max-w-3xl px-5 pb-16 sm:pb-20">
          <p className="text-[11px] uppercase tracking-[0.2em] mb-4" style={{ color: artist.accent }}>On Spotify</p>
          <iframe
            className="rounded-2xl w-full"
            src={`https://open.spotify.com/embed/artist/${artist.spotifyArtistEmbedId}?theme=0`}
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />

          {artist.spotifyTrackEmbeds && artist.spotifyTrackEmbeds.length > 0 && (
            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-[0.2em] mb-3 text-white/60">Latest tracks</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {artist.spotifyTrackEmbeds.map((t) => (
                  <iframe
                    key={t.id}
                    className="rounded-xl w-full"
                    title={`${t.title} — Spotify preview`}
                    src={`https://open.spotify.com/embed/track/${t.id}?theme=0`}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                ))}
              </div>
              <a
                href={`https://open.spotify.com/artist/${artist.spotifyArtistEmbedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                View all tracks on Spotify
                <span aria-hidden>→</span>
              </a>
            </div>
          )}
        </section>
      )}

      {/* SOCIALS GRID */}
      <section className="mx-auto max-w-6xl px-5 pb-20 border-t border-white/5 pt-16 sm:pt-20">
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: artist.accent }}>Follow</p>
        <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold mb-6">Everywhere {artist.displayName} lives</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {artist.socials.map((s) => {
            const Icon = ICONS[s.kind];
            return (
              <a
                key={s.kind + s.href}
                href={s.href}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
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

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} {artist.displayName}. All rights reserved.</div>
          <Link to="/" className="hover:text-white/80 inline-flex items-center gap-2">
            <span style={{ color: artist.accent }}>●</span> Powered by <span className="font-heading font-bold text-white">UPLY</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
