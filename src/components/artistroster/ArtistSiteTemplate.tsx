import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  DollarSign,
  Facebook,
  Globe,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  Music2,
  Play,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Users,
  X,
  Youtube,
} from "lucide-react";
import {
  findArtistBySlug,
  type ArtistRosterEntry,
  type SocialKind,
} from "@/data/artistRoster";
import { supabase } from "@/integrations/supabase/client";
import { getSiteUrl } from "@/lib/siteUrl";
import SEOHead, { buildPersonSchema } from "@/components/SEOHead";
import ArtistSectionNav from "./ArtistSectionNav";
import ArtistDisclaimers from "./ArtistDisclaimers";
import { trackEvent } from "@/lib/posthog";

/**
 * ArtistSiteTemplate — THE shared editorial artist site for every roster
 * artist, modeled on the owner-approved Arya XO site (dark editorial,
 * accent-driven) and folding in the best features of the old
 * ArtistSitePage + ArtistLinkPage:
 *
 *   • ArtistSectionNav (Links / Site / Blog / Community / Courses / Account)
 *   • Sticky in-page anchor nav (Music / Videos / Press / About / Tour / Booking)
 *   • Share (native share → modal w/ copy + X/Facebook/SMS)
 *   • Hero: badge chip, huge display name w/ accent word, tagline,
 *     streaming/CTA pill buttons, portrait w/ accent glow, marquee strip
 *   • Releases grid with play overlays · Videos (YouTube embed / IG fallback)
 *   • Featured blog cross-link → /:slug/blog
 *   • About: bio, milestones timeline, stat cards, gallery
 *   • Tour demand: fans vote their city (public_tour_requests + realtime)
 *   • Booking: full inline CRM form → public_booking_inquiries
 *   • Spotify artist embed + track previews (PostHog instrumented)
 *   • Socials grid with brand-colored icons · footer
 *
 * Sections self-hide when an artist lacks the data. Styling is the scoped
 * `.arya-site` design system from index.css; the artist's accent recolors
 * it through CSS variables, so the page stays dark-editorial regardless of
 * the app theme (these are artist-branded microsites).
 */

// ── Per-artist accent → scoped CSS variables ─────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function accentVars(accent: string): CSSProperties {
  const rgb = hexToRgb(accent) ?? { r: 0, g: 255, b: 133 };
  const a = (alpha: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return {
    "--arya-cta": accent,
    "--arya-cta-hover": accent,
    "--arya-cta-press": a(0.85),
    "--arya-cta-fg": lum > 0.45 ? "#0a0a0a" : "#ffffff",
    "--arya-cta-soft": a(0.12),
    "--arya-cta-soft-strong": a(0.22),
    "--arya-cta-border": a(0.32),
    "--arya-glow": `0 10px 40px -10px ${a(0.6)}`,
    "--arya-glow-strong": `0 18px 60px -12px ${a(0.75)}`,
    "--arya-ring": `0 0 0 2px #050505, 0 0 0 4px ${accent}`,
  } as CSSProperties;
}

const SOCIAL_ICONS: Record<SocialKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
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

/** Brand-colored icon chips — carried over from ArtistLinkPage. */
const SOCIAL_BRAND_BG: Record<SocialKind, string> = {
  instagram: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  youtube: "bg-[#FF0000]",
  spotify: "bg-[#1DB954]",
  apple_music: "bg-gradient-to-br from-[#FA243C] to-[#FB5C74]",
  soundcloud: "bg-[#FF5500]",
  tiktok: "bg-black",
  facebook: "bg-[#1877F2]",
  threads: "bg-black",
  website: "bg-white/15",
  email: "bg-[#6B7280]",
};

const PERFORMER_EVENT_TYPES = [
  "Club / Live Show",
  "Festival",
  "Private / Corporate",
  "Brand Activation",
  "Feature / Studio Session",
];
const BUSINESS_ENGAGEMENT_TYPES = [
  "Speaking / Keynote",
  "Workshop / Training",
  "Consulting / Advisory",
  "Brand Partnership",
  "Podcast / Interview",
];

export interface ArtistSiteHeroLink {
  label: string;
  href: string;
  primary?: boolean;
  /** Defaults to true for http(s) links. */
  external?: boolean;
}

export interface ArtistSiteFeatured {
  href: string;
  kicker: string;
  title: string;
  excerpt: string;
  tags?: string[];
  imageUrl?: string;
}

export interface ArtistSiteTemplateProps {
  /** Roster slug (or alias); resolved via findArtistBySlug. */
  slug: string;
  /** Bespoke content merged over the roster entry (e.g. Arya XO). */
  overrides?: Partial<ArtistRosterEntry>;
  /** Hero CTA pills. Defaults derive from socials (Spotify / Apple / YouTube). */
  heroLinks?: ArtistSiteHeroLink[];
  /** Rich hero paragraph; defaults to artist.tagline. */
  heroTagline?: ReactNode;
  /** Blurred hero backdrop photo; falls back to the artist gradient wash. */
  heroBgUrl?: string;
  /** Featured editorial block override (bespoke blogs like Arya's). */
  featured?: ArtistSiteFeatured;
  /** Fresh share-URL factory (Arya overrides for OG cache-busting). */
  buildShareUrl?: () => string;
  /** OG image override for SEOHead. */
  ogImage?: string;
  /** Extra page-level nodes (e.g. Arya's 150 BANDS autoplay chip). */
  children?: ReactNode;
}

/**
 * Creator-type persona → which site sections are logical.
 * Performers (singers, rappers, DJs, bands…) get Music + Tour + show-style
 * booking. Everyone else (entrepreneurs, founders, coaches, educators, authors…)
 * gets a business-framed "Work with me" section and no Music/Tour — those tabs
 * make no sense for a non-artist.
 */
const PERFORMER_TYPES = new Set([
  "singer", "rapper", "dj", "musician", "band", "producer", "artist",
  "performer", "comedian", "dancer", "vocalist", "instrumentalist",
]);

export function sitePersona(creatorType?: string): {
  isPerformer: boolean;
  bookingLabel: string;
  bookingEyebrow: string;
  bookingHeading: (name: string) => string;
  bookingDefaultTagline: string;
} {
  const isPerformer = PERFORMER_TYPES.has((creatorType ?? "").trim().toLowerCase());
  return isPerformer
    ? {
        isPerformer: true,
        bookingLabel: "Booking",
        bookingEyebrow: "Direct booking",
        bookingHeading: (name) => `Book ${name} in 60 seconds.`,
        bookingDefaultTagline:
          "Fill four fields, hit send. No agents, no back-and-forth — your inquiry lands directly in the team's inbox on UPLY and gets a same-week reply.",
      }
    : {
        isPerformer: false,
        bookingLabel: "Work with me",
        bookingEyebrow: "Work together",
        bookingHeading: (name) => `Work with ${name}.`,
        bookingDefaultTagline:
          "Speaking, consulting, brand partnerships, or a collab — tell me what you have in mind. Your inquiry lands directly in my inbox on UPLY and gets a same-week reply.",
      };
}

export default function ArtistSiteTemplate(props: ArtistSiteTemplateProps) {
  const base = findArtistBySlug(props.slug);
  if (!base) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
        <div>
          <p className="opacity-60">Artist not found.</p>
          <Link to="/" className="underline text-primary mt-2 inline-block">Back to UPLY</Link>
        </div>
      </main>
    );
  }
  // Key by slug so all form/share state resets when navigating between artists.
  return <ArtistSiteBody key={base.slug} {...props} baseArtist={base} />;
}

function ArtistSiteBody({
  baseArtist,
  overrides,
  heroLinks,
  heroTagline,
  heroBgUrl,
  featured,
  buildShareUrl,
  ogImage,
  children,
}: ArtistSiteTemplateProps & { baseArtist: ArtistRosterEntry }) {
  const artist = useMemo(
    () => ({ ...baseArtist, ...overrides }) as ArtistRosterEntry,
    [baseArtist, overrides],
  );
  const slug = baseArtist.slug;
  const canonicalPath = `/${slug}-site`;

  // ── Share ───────────────────────────────────────────────
  const makeShareUrl = buildShareUrl ?? (() => `${getSiteUrl()}${canonicalPath}`);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeShareUrl, setActiveShareUrl] = useState<string>(() => makeShareUrl());

  const makeFreshShareUrl = () => {
    const url = makeShareUrl();
    setActiveShareUrl(url);
    return url;
  };

  const handleCopy = async () => {
    const url = makeFreshShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = async () => {
    const url = makeFreshShareUrl();
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${artist.displayName} — Official Site`,
          text: `${artist.displayName} — ${artist.tagline}`,
          url,
        });
        return;
      } catch {
        /* fall through to the modal */
      }
    }
    setActiveShareUrl(url);
    setShareOpen(true);
  };

  // ── Derived content ─────────────────────────────────────
  const bioParas = artist.bio.split("\n\n");
  const featuredPost =
    artist.posts?.find((p) => p.slug === artist.featuredPostSlug) ?? artist.posts?.[0];
  const featuredBlock: ArtistSiteFeatured | null =
    featured ??
    (featuredPost
      ? {
          href: `/${slug}/blog/${featuredPost.slug}`,
          kicker: `${featuredPost.tag ?? "Feature"} · ${featuredPost.readTime}`,
          title: featuredPost.title,
          excerpt: featuredPost.excerpt,
          imageUrl: featuredPost.coverUrl ?? artist.portraitUrl,
        }
      : null);

  const socialOf = (kind: SocialKind) => artist.socials.find((s) => s.kind === kind);
  const derivedHeroLinks: ArtistSiteHeroLink[] = [
    socialOf("spotify") && { label: "Spotify", href: socialOf("spotify")!.href, primary: true },
    socialOf("apple_music") && { label: "Apple Music", href: socialOf("apple_music")!.href },
    socialOf("youtube") && { label: "YouTube", href: socialOf("youtube")!.href },
  ].filter(Boolean) as ArtistSiteHeroLink[];
  const ctaLinks = heroLinks ?? derivedHeroLinks;

  // Creator-type drives which sections make sense (musician vs entrepreneur/etc).
  const persona = sitePersona(artist.creatorType);
  const sections: { id: string; label: string }[] = [
    persona.isPerformer && artist.releases?.length ? { id: "music", label: "Music" } : null,
    artist.videos?.length ? { id: "videos", label: "Videos" } : null,
    featuredBlock ? { id: "press", label: "Press" } : null,
    { id: "about", label: "About" },
    persona.isPerformer ? { id: "tour", label: "Tour" } : null,
    artist.bookingEmail ? { id: "booking", label: persona.bookingLabel } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const ogImageUrl =
    ogImage ??
    (artist.portraitUrl
      ? artist.portraitUrl.startsWith("http")
        ? artist.portraitUrl
        : `${getSiteUrl()}${artist.portraitUrl}`
      : undefined);

  const jsonLd = useMemo(
    () =>
      buildPersonSchema({
        name: artist.displayName,
        url: `${getSiteUrl()}${canonicalPath}`,
        image: ogImageUrl,
        description: artist.tagline,
        sameAs: artist.socials
          .map((s) => s.href)
          .filter((href) => href.startsWith("http")),
      }),
    [artist, canonicalPath, ogImageUrl],
  );

  return (
    <div className="arya-site min-h-screen" style={accentVars(artist.accent)}>
      <SEOHead
        title={`${artist.displayName} — Official Site`}
        description={artist.tagline}
        image={ogImageUrl}
        canonicalUrl={`${getSiteUrl()}${canonicalPath}`}
        type="profile"
        jsonLd={jsonLd}
      />
      <ArtistSectionNav artist={artist} />
      {children}

      {/* Sticky in-page anchor nav */}
      <nav
        aria-label={`${artist.displayName} site sections`}
        className="sticky top-12 z-30 backdrop-blur-xl bg-black/60 border-b border-[var(--arya-border)]"
      >
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2 font-heading font-extrabold tracking-tight text-sm">
            <AccentName name={artist.displayName} />
          </a>
          <div className="hidden sm:flex items-center gap-6 text-xs">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="arya-link">{s.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="arya-btn arya-btn--primary arya-btn--sm"
              aria-label="Share this page"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <Link to={`/${slug}`} className="arya-btn arya-btn--ghost arya-btn--sm">
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
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--arya-text-mute)] mb-2">Public link</p>
            <div className="flex items-center gap-2 arya-card p-2">
              <input
                readOnly
                value={activeShareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent text-sm px-2 py-2 outline-none truncate"
              />
              <button onClick={handleCopy} className="arya-btn arya-btn--primary arya-btn--sm">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(activeShareUrl)}&text=${encodeURIComponent(artist.displayName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--ghost arya-btn--sm"
              >
                X / Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeShareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--ghost arya-btn--sm"
              >
                Facebook
              </a>
              <a
                href={`sms:?&body=${encodeURIComponent(`${artist.displayName} — ${activeShareUrl}`)}`}
                className="arya-btn arya-btn--ghost arya-btn--sm"
              >
                Text
              </a>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <header id="top" className="relative isolate overflow-hidden">
        {heroBgUrl ? (
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-md opacity-60"
            style={{ backgroundImage: `url(${heroBgUrl})` }}
            aria-hidden
          />
        ) : (
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, transparent 70%)`,
            }}
            aria-hidden
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/80 to-[#050505]" />

        <div
          className={`mx-auto max-w-6xl px-5 pt-16 pb-16 sm:pt-24 sm:pb-24 grid ${artist.portraitUrl ? "sm:grid-cols-[1.1fr_1fr]" : ""} gap-10 items-center`}
        >
          <div className={artist.portraitUrl ? "" : "text-center mx-auto max-w-2xl"}>
            {artist.heroChip && (
              <div className="arya-chip">
                <Sparkles className="h-3 w-3" /> {artist.heroChip}
              </div>
            )}
            {artist.eyebrow && (
              <p className="mt-5 text-[11px] tracking-[0.28em] uppercase text-[var(--arya-cta)]">
                {artist.eyebrow}
              </p>
            )}
            <h1 className="mt-4 font-heading font-extrabold tracking-tight leading-[0.92] text-[52px] sm:text-[96px]">
              <AccentName name={artist.displayName} />
            </h1>
            <p className={`mt-5 text-base sm:text-lg text-[var(--arya-text-dim)] max-w-xl ${artist.portraitUrl ? "" : "mx-auto"}`}>
              {heroTagline ?? artist.tagline}
            </p>

            <div className={`mt-7 flex flex-col sm:flex-row flex-wrap gap-3 ${artist.portraitUrl ? "" : "justify-center"}`}>
              {ctaLinks.map((l) => {
                const external = l.external ?? l.href.startsWith("http");
                return (
                  <a
                    key={l.label + l.href}
                    href={l.href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`arya-btn ${l.primary ? "arya-btn--primary" : "arya-btn--ghost"} arya-btn--lg`}
                  >
                    <Play className="h-4 w-4 fill-current" /> {l.label}
                  </a>
                );
              })}
              {artist.bookingEmail && (
                <a href="#booking" className="arya-btn arya-btn--ghost arya-btn--lg">
                  <Mail className="h-4 w-4" /> {persona.isPerformer ? "Book" : "Work with me"}
                </a>
              )}
            </div>

            {artist.location && (
              <p className={`mt-8 text-[11px] uppercase tracking-[0.25em] text-[var(--arya-text-faint)] ${artist.portraitUrl ? "" : "text-center"}`}>
                {artist.location}
              </p>
            )}
          </div>

          {artist.portraitUrl && (
            <div className="relative mx-auto">
              <div className="absolute -inset-8 -z-10 rounded-full blur-3xl opacity-30 bg-[var(--arya-cta)]" />
              <div className="h-64 w-64 sm:h-[22rem] sm:w-[22rem] rounded-[2rem] overflow-hidden ring-1 ring-white/15 shadow-[var(--arya-glow-strong)]">
                <img
                  src={artist.portraitUrl}
                  alt={artist.displayName}
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Marquee */}
        {artist.marquee && artist.marquee.length > 0 && (
          <>
            <div className="border-y border-white/5 bg-black/40">
              <div className="overflow-hidden">
                <div className="flex gap-10 whitespace-nowrap py-3 animate-[artist-marquee_30s_linear_infinite] font-heading text-sm uppercase tracking-[0.25em] text-white/40">
                  {Array.from({ length: 2 }).flatMap((_, i) =>
                    artist.marquee!.map((t, j) => (
                      <span key={`${i}-${j}`} className="flex items-center gap-10">
                        {t}
                        <span className="text-[var(--arya-cta)]">✦</span>
                      </span>
                    )),
                  )}
                </div>
              </div>
            </div>
            <style>{`@keyframes artist-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
          </>
        )}
      </header>

      {/* MUSIC / RELEASES — performers only */}
      {persona.isPerformer && artist.releases && artist.releases.length > 0 && (
        <section id="music" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Discography</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Latest releases</h2>

          <div className={`mt-8 grid sm:grid-cols-2 ${artist.releases.length > 2 ? "lg:grid-cols-3" : ""} gap-4`}>
            {artist.releases.map((r) => {
              const Wrap: any = r.href ? "a" : "div";
              const wrapProps = r.href
                ? r.href.startsWith("http")
                  ? { href: r.href, target: "_blank", rel: "noopener noreferrer" }
                  : { href: r.href }
                : {};
              return (
                <Wrap
                  key={r.title}
                  {...wrapProps}
                  className="arya-card arya-card--interactive group relative overflow-hidden p-5"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-black/40 ring-1 ring-[var(--arya-border)] mb-4 relative">
                    {r.coverUrl ? (
                      <img
                        src={r.coverUrl}
                        alt={r.title}
                        className="h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{ background: `linear-gradient(160deg, ${artist.gradient.from}, ${artist.gradient.to})` }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-14 w-14 rounded-full bg-[var(--arya-cta)] text-[var(--arya-cta-fg)] flex items-center justify-center shadow-[var(--arya-glow)] group-hover:scale-110 transition">
                        <Play className="h-6 w-6 fill-current" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--arya-cta)]">
                    <Sparkles className="h-3 w-3" /> {r.tag ?? "Release"} · {r.year}
                  </div>
                  <div className="mt-1 font-heading text-xl font-bold">{r.title}</div>
                  {r.feat && <div className="text-xs text-[var(--arya-text-mute)]">{r.feat}</div>}
                </Wrap>
              );
            })}
          </div>
        </section>
      )}

      {/* VIDEOS */}
      {artist.videos && artist.videos.length > 0 && (
        <section id="videos" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Watch</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Videos</h2>

          <div className={`mt-8 grid gap-6 ${artist.videos.length > 1 ? "md:grid-cols-2" : ""}`}>
            {artist.videos.map((v, i) => (
              <div key={v.youtubeId ?? v.instagramUrl ?? i} className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                {v.youtubeId ? (
                  <div className="relative pb-[56.25%] h-0">
                    <iframe
                      className="absolute inset-0 h-full w-full"
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
                      <div className="text-[12px] opacity-80 mt-1">
                        @{artist.socials.find((s) => s.kind === "instagram")?.handle ?? slug}
                      </div>
                    </div>
                  </a>
                ) : null}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="font-semibold text-[15px]">{v.title}</div>
                  {v.youtubeId ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1 shrink-0"
                    >
                      Watch on YouTube <ArrowRight className="h-3 w-3" />
                    </a>
                  ) : (
                    v.caption && <div className="text-[12px] text-[var(--arya-text-mute)]">{v.caption}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED BLOG / PRESS */}
      {featuredBlock && (
        <section id="press" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Featured</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">From the blog</h2>

          <Link
            to={featuredBlock.href}
            className="mt-8 group grid sm:grid-cols-[1.1fr_1.4fr] gap-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] hover:border-[var(--arya-cta-border)] transition"
          >
            <div
              className="aspect-[4/3] sm:aspect-auto overflow-hidden bg-black"
              style={
                featuredBlock.imageUrl
                  ? undefined
                  : { background: `linear-gradient(160deg, ${artist.gradient.from}, ${artist.gradient.to})` }
              }
            >
              {featuredBlock.imageUrl && (
                <img
                  src={featuredBlock.imageUrl}
                  alt={`${artist.displayName} feature`}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition duration-700"
                />
              )}
            </div>
            <div className="p-6 sm:p-10 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/50">{featuredBlock.kicker}</div>
              <h3 className="mt-3 font-heading text-2xl sm:text-4xl font-extrabold leading-[1.05]">
                {featuredBlock.title}
              </h3>
              <p className="mt-4 text-white/70 text-[15px] leading-relaxed">{featuredBlock.excerpt}</p>
              {featuredBlock.tags && featuredBlock.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {featuredBlock.tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] uppercase tracking-wider text-white/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-6 inline-flex items-center gap-2 text-[var(--arya-cta)] font-semibold text-sm">
                Read the feature <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ABOUT / STORY */}
      <section id="about" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
        <div className={`grid ${artist.milestones?.length ? "sm:grid-cols-[1fr_1.2fr]" : ""} gap-10 items-start`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">About</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">The story so far</h2>
            <div className="mt-4 space-y-3">
              {bioParas.map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-white/75">{p}</p>
              ))}
            </div>
          </div>

          {artist.milestones && artist.milestones.length > 0 && (
            <ol className="relative border-l border-white/10 pl-6 space-y-6">
              {artist.milestones.map((m, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-[var(--arya-cta)] ring-4 ring-[var(--arya-cta-soft-strong)]" />
                  <div className="text-[11px] uppercase tracking-wider text-white/50">
                    {m.age != null ? `Age ${m.age}` : m.year}
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
              <div key={s.k} className="arya-card p-4">
                <div className="text-[10px] uppercase tracking-wider text-[var(--arya-text-mute)]">{s.k}</div>
                <div className="mt-1 font-heading text-base font-bold">{s.v}</div>
              </div>
            ))}
          </div>
        )}

        {artist.gallery && artist.gallery.length > 0 && (
          <div className="mt-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Gallery</p>
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

      {/* TOUR REQUESTS — fans vote for their city (performers only) */}
      {persona.isPerformer && (
        <TourRequestsSection slug={slug} displayName={artist.displayName} />
      )}

      {/* BOOKING / WORK-WITH-ME — inline CRM form */}
      {artist.bookingEmail && (
        <BookingSection artist={artist} slug={slug} persona={persona} />
      )}

      {/* SPOTIFY EMBED */}
      {artist.spotifyArtistEmbedId && (
        <section className="mx-auto max-w-3xl px-5 pb-16 sm:pb-20">
          <p className="text-[11px] uppercase tracking-[0.2em] mb-4 text-[var(--arya-cta)]">On Spotify</p>
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
                {artist.spotifyTrackEmbeds.map((t, idx) => (
                  <SpotifyTrackPreview key={t.id} trackId={t.id} title={t.title} artistSlug={slug} position={idx} />
                ))}
              </div>
              <a
                href={`https://open.spotify.com/artist/${artist.spotifyArtistEmbedId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("spotify_view_all_tracks_click", {
                    artist_slug: slug,
                    artist_name: artist.displayName,
                    spotify_artist_id: artist.spotifyArtistEmbedId,
                    location: "artist_site_spotify_section",
                  })
                }
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
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Follow</p>
        <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold mb-6">
          Everywhere {artist.displayName} lives
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {artist.socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.kind];
            return (
              <a
                key={s.kind + s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 arya-card arya-card--interactive"
              >
                <div className={`w-10 h-10 rounded-xl ${SOCIAL_BRAND_BG[s.kind]} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
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
      <footer className="border-t border-white/5">
        <ArtistDisclaimers artist={artist} className="mx-auto max-w-3xl px-5 pt-8" />
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} {artist.displayName}. All rights reserved.</div>
          <Link to="/" className="hover:text-white/80 inline-flex items-center gap-2">
            <span className="text-[var(--arya-cta)]">●</span> Powered by{" "}
            <span className="font-heading font-bold text-white">UPLY</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Huge display name with the last word accent-colored (Arya XO pattern). */
function AccentName({ name }: { name: string }) {
  const idx = name.lastIndexOf(" ");
  if (idx <= 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx + 1)}
      <span className="text-[var(--arya-cta)]">{name.slice(idx + 1)}</span>
    </>
  );
}

// ── Booking (inline CRM form → public_booking_inquiries) ────
function BookingSection({
  artist,
  slug,
  persona,
}: {
  artist: ArtistRosterEntry;
  slug: string;
  persona: ReturnType<typeof sitePersona>;
}) {
  const engagementTypes = persona.isPerformer ? PERFORMER_EVENT_TYPES : BUSINESS_ENGAGEMENT_TYPES;
  const emptyForm = {
    contact_name: "",
    contact_email: "",
    contact_org: "",
    event_type: engagementTypes[0],
    event_city: "",
    event_date: "",
    budget_usd: "",
    lineup: "",
    message: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update =
    (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = useMemo(
    () => form.contact_name.trim() && /\S+@\S+\.\S+/.test(form.contact_email) && form.event_city.trim(),
    [form],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        artist_slug: slug,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_org: form.contact_org.trim() || null,
        event_type: form.event_type,
        event_city: form.event_city.trim(),
        event_date: form.event_date || null,
        budget_usd: form.budget_usd ? Math.max(0, Math.round(Number(form.budget_usd))) : null,
        lineup: form.lineup.trim() || null,
        message: form.message.trim() || null,
        source: `${slug}-site`,
      };
      const { error: insertErr } = await supabase
        .from("public_booking_inquiries")
        .insert(payload);
      if (insertErr) throw insertErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || `Couldn't send. Try again or email ${artist.bookingEmail}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="booking" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
      <div className="arya-card arya-card--feature rounded-3xl p-6 sm:p-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12">
          {/* Left: pitch */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">{persona.bookingEyebrow}</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold leading-tight">
              {persona.bookingHeading(artist.displayName)}
            </h2>
            <p className="mt-3 text-[var(--arya-text-dim)] max-w-md">
              {artist.bookingTagline ?? persona.bookingDefaultTagline}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="arya-card p-4">
                <MapPin className="h-4 w-4 text-[var(--arya-cta)]" />
                <div className="mt-2 font-semibold text-sm">{persona.isPerformer ? "Touring from" : "Based in"}</div>
                <div className="text-[var(--arya-text-mute)] text-xs">{artist.location ?? "Worldwide"}</div>
              </div>
              <div className="arya-card p-4">
                <Calendar className="h-4 w-4 text-[var(--arya-cta)]" />
                <div className="mt-2 font-semibold text-sm">Availability</div>
                <div className="text-[var(--arya-text-mute)] text-xs">Now booking 2026</div>
              </div>
              <div className="arya-card p-4">
                <DollarSign className="h-4 w-4 text-[var(--arya-cta)]" />
                <div className="mt-2 font-semibold text-sm">{persona.isPerformer ? "Fee range" : "Rates"}</div>
                <div className="text-[var(--arya-text-mute)] text-xs">Tiered — share your budget</div>
              </div>
              <div className="arya-card p-4">
                <Users className="h-4 w-4 text-[var(--arya-cta)]" />
                <div className="mt-2 font-semibold text-sm">{persona.isPerformer ? "Lineups welcome" : "Formats"}</div>
                <div className="text-[var(--arya-text-mute)] text-xs">
                  {persona.isPerformer ? "Festivals, clubs, brand events" : "Talks, workshops, advisory"}
                </div>
              </div>
            </div>

            <div className="mt-6 text-[11px] text-[var(--arya-text-faint)]">
              Prefer email?{" "}
              <a className="arya-link underline" href={`mailto:${artist.bookingEmail}`}>
                {artist.bookingEmail}
              </a>
            </div>
          </div>

          {/* Right: form */}
          <div className="arya-card p-5 sm:p-6">
            {/* Optional call scheduler — renders only when the artist sets bookCallUrl. */}
            {artist.bookCallUrl && !submitted && (
              <div className="mb-5 pb-5 border-b border-white/10">
                <p className="text-sm text-[var(--arya-text-dim)] mb-3">
                  Prefer to talk? Book a call with {artist.displayName}&apos;s team.
                </p>
                <a
                  href={artist.bookCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arya-btn arya-btn--primary arya-btn--lg w-full"
                >
                  <Calendar className="h-4 w-4" /> Book a call
                </a>
                <p className="mt-3 text-[11px] text-[var(--arya-text-faint)] text-center">
                  Or send an inquiry below — every message gets a reply.
                </p>
              </div>
            )}
            {submitted ? (
              <div className="min-h-[420px] flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-full bg-[var(--arya-cta)] text-[var(--arya-cta-fg)] flex items-center justify-center mb-4 shadow-[var(--arya-glow)]">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl font-bold">Inquiry sent.</h3>
                <p className="mt-2 text-sm text-white/70 max-w-sm">
                  Your request is in front of {artist.displayName}&apos;s team on UPLY. Expect a reply
                  within 3 business days — sooner for time-sensitive dates.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm(emptyForm);
                  }}
                  className="mt-6 text-xs text-white/60 hover:text-white underline"
                >
                  Submit another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Your name *">
                    <input
                      required
                      value={form.contact_name}
                      onChange={update("contact_name")}
                      placeholder="Jane Doe"
                      className="arya-input"
                    />
                  </Field>
                  <Field label="Email *">
                    <input
                      required
                      type="email"
                      value={form.contact_email}
                      onChange={update("contact_email")}
                      placeholder="you@venue.com"
                      className="arya-input"
                    />
                  </Field>
                </div>

                <Field label="Company / venue (optional)">
                  <input
                    value={form.contact_org}
                    onChange={update("contact_org")}
                    placeholder="Venue, festival, brand, etc."
                    className="arya-input"
                  />
                </Field>

                <Field label={persona.isPerformer ? "Event type" : "Engagement type"}>
                  <select value={form.event_type} onChange={update("event_type")} className="arya-input">
                    {engagementTypes.map((t) => (
                      <option key={t} value={t} className="bg-[#0c0c0c]">{t}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Location (city, country) *">
                    <input
                      required
                      value={form.event_city}
                      onChange={update("event_city")}
                      placeholder={persona.isPerformer ? "Las Vegas, USA" : "Remote or city, country"}
                      className="arya-input"
                    />
                  </Field>
                  <Field label={persona.isPerformer ? "Event date" : "Preferred date"}>
                    <input type="date" value={form.event_date} onChange={update("event_date")} className="arya-input" />
                  </Field>
                </div>

                <Field label="Budget (USD)">
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={form.budget_usd}
                    onChange={update("budget_usd")}
                    placeholder="25000"
                    className="arya-input"
                  />
                </Field>

                {persona.isPerformer && (
                  <Field label="Lineup / other artists on the bill">
                    <input
                      value={form.lineup}
                      onChange={update("lineup")}
                      placeholder="Headliner, support, +others"
                      className="arya-input"
                    />
                  </Field>
                )}

                <Field label={persona.isPerformer ? "Anything else (set length, hospitality, etc.)" : "Tell me more (goals, audience, scope…)"}>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={update("message")}
                    placeholder={persona.isPerformer ? "60-min set, festival main stage, deposit terms…" : "Audience size, topic, timeline, deliverables…"}
                    className="arya-input resize-none"
                  />
                </Field>

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="arya-btn arya-btn--primary arya-btn--lg w-full mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Sending…" : "Send booking inquiry"}
                </button>

                <p className="text-[10px] text-white/40 text-center pt-1">
                  Inquiries land inside UPLY. We never share your info.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="arya-label">{label}</span>
      {children}
    </label>
  );
}

// ── Tour requests (anonymous voting) ─────────────────────
interface TourRequest {
  id: string;
  city: string;
  country: string;
  vote_count: number;
}

function getVoterFp(): string {
  try {
    const k = "uply_voter_fp";
    let v = localStorage.getItem(k);
    if (!v) {
      v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `anon-${Math.random().toString(36).slice(2)}`;
  }
}

function getVotedSet(slug: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(`uply_voted_tour_${slug}`) || "[]"));
  } catch {
    return new Set();
  }
}
function markVoted(slug: string, id: string) {
  try {
    const s = getVotedSet(slug);
    s.add(id);
    localStorage.setItem(`uply_voted_tour_${slug}`, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

function TourRequestsSection({ slug, displayName }: { slug: string; displayName: string }) {
  const [items, setItems] = useState<TourRequest[]>([]);
  const [voted, setVoted] = useState<Set<string>>(() => getVotedSet(slug));
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("public_tour_requests")
      .select("id, city, country, vote_count")
      .eq("artist_slug", slug)
      .order("vote_count", { ascending: false })
      .limit(50);
    setItems((data || []) as TourRequest[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`${slug}-tour-requests`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_tour_requests" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const vote = async (id: string) => {
    if (voted.has(id)) return;
    // Optimistic
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, vote_count: i.vote_count + 1 } : i)));
    setVoted((prev) => new Set(prev).add(id));
    markVoted(slug, id);
    const { error } = await supabase.rpc("vote_public_tour_request", {
      _request_id: id,
      _voter_fp: getVoterFp(),
    });
    if (error) {
      setError(error.message);
      load();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    setSubmitting(true);
    setError(null);
    const { data, error } = await supabase.rpc("create_public_tour_request", {
      _artist_slug: slug,
      _city: city.trim(),
      _country: country.trim(),
      _voter_fp: getVoterFp(),
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      markVoted(slug, data as string);
      setVoted((prev) => new Set(prev).add(data as string));
    }
    setCity("");
    setCountry("");
    load();
  };

  const top = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <section id="tour" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
      <div className="grid lg:grid-cols-[1.1fr_1.4fr] gap-10 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Tour demand</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold leading-tight">
            Pull up to your city.
          </h2>
          <p className="mt-3 text-white/75 max-w-md">
            Vote your city up the list. Promoters see real demand — and {displayName} routes
            tours to the cities with the loudest fans.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-2">
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                required
                maxLength={80}
                className="arya-input"
              />
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                maxLength={80}
                className="arya-input"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !city.trim()}
              className="arya-btn arya-btn--primary w-full disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Request my city
            </button>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
                {error}
              </div>
            )}
          </form>
        </div>

        <div>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
              Be the first to put your city on the map.
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {top.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => vote(t.id)}
                    disabled={voted.has(t.id)}
                    className={`arya-card ${idx === 0 ? "arya-card--feature" : "arya-card--interactive"} text-left p-4 disabled:opacity-70 disabled:cursor-default`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--arya-text-mute)]">#{idx + 1}</div>
                      <div className={`text-[10px] uppercase tracking-wider font-bold ${idx === 0 ? "text-[var(--arya-cta)]" : "text-[var(--arya-text-faint)]"}`}>
                        {t.vote_count} {t.vote_count === 1 ? "vote" : "votes"}
                      </div>
                    </div>
                    <div className="mt-2 font-heading text-lg font-bold leading-tight">{t.city}</div>
                    {t.country && <div className="text-xs text-[var(--arya-text-mute)]">{t.country}</div>}
                    <div className={`mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold ${voted.has(t.id) ? "text-[var(--arya-text-faint)]" : "text-[var(--arya-cta)]"}`}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {voted.has(t.id) ? "Voted" : "Thumbs up"}
                    </div>
                  </button>
                ))}
              </div>

              {rest.length > 0 && (
                <ul className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
                  {rest.map((t, idx) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-7 text-[11px] text-white/40">#{idx + 4}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {t.city}
                          {t.country ? `, ${t.country}` : ""}
                        </div>
                      </div>
                      <span className="text-[11px] text-white/50 tabular-nums">{t.vote_count}</span>
                      <button
                        onClick={() => vote(t.id)}
                        disabled={voted.has(t.id)}
                        aria-label={voted.has(t.id) ? "Voted" : "Thumbs up"}
                        className={
                          voted.has(t.id)
                            ? "arya-btn arya-btn--ghost arya-btn--sm opacity-60 inline-flex items-center gap-1.5"
                            : "arya-btn arya-btn--primary arya-btn--sm inline-flex items-center gap-1.5"
                        }
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {voted.has(t.id) ? "Voted" : "Vote"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Spotify track preview (PostHog instrumented) ──────────
interface SpotifyTrackPreviewProps {
  trackId: string;
  title: string;
  artistSlug: string;
  position: number;
}

/**
 * Compact Spotify track embed that best-effort logs a click event when the
 * user interacts with the iframe (cross-origin, so we use the standard
 * iframe-focus heuristic). Each track logs once per page load.
 */
function SpotifyTrackPreview({ trackId, title, artistSlug, position }: SpotifyTrackPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const firedRef = useRef(false);

  const fire = (source: string) => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent("spotify_track_preview_click", {
      artist_slug: artistSlug,
      spotify_track_id: trackId,
      track_title: title,
      position,
      source,
      location: "artist_site_spotify_section",
    });
  };

  useEffect(() => {
    const onBlur = () => {
      if (document.activeElement === iframeRef.current) fire("iframe_focus");
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div onPointerDown={() => fire("pointerdown")}>
      <iframe
        ref={iframeRef}
        className="rounded-xl w-full block"
        title={`${title} — Spotify preview`}
        src={`https://open.spotify.com/embed/track/${trackId}?theme=0`}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}
