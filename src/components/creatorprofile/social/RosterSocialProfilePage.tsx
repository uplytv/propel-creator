import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, MapPin, Sparkles, Share2, ExternalLink, Globe, Instagram, Youtube, Music2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { ArtistRosterEntry, ArtistSocial } from "@/data/artistRoster";
import { usePageMeta } from "@/features/music/components/ArtistPage/usePageMeta";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildProfileShareUrl } from "@/lib/shareUrls";
import { trackEvent } from "@/lib/posthog";
import BioBlock from "./BioBlock";

/**
 * Roster-backed social profile page. Mirrors the look of SocialCreatorPage
 * (cover, avatar, identity row, stats strip, bio, social icons, links shelf)
 * but is fed entirely by ARTIST_ROSTER — no auth user, no DB row required.
 *
 * Mounted by SocialHandleRouter when /@<handle> matches a roster slug or alias.
 */

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  spotify: Music2,
  apple_music: Music2,
  soundcloud: Music2,
  threads: Globe,
  facebook: Globe,
  tiktok: Globe,
  website: Globe,
  email: Mail,
};

export default function RosterSocialProfilePage({ artist }: { artist: ArtistRosterEntry }) {
  const navigate = useNavigate();
  const [isSharing, setIsSharing] = useState(false);

  const canonicalSlug = artist.slug;
  const canonicalUrl = `${getSiteUrl()}/@${canonicalSlug}`;
  const ogImage = artist.portraitUrl || null;

  usePageMeta({
    title: `${artist.displayName} | UPLY`,
    description: artist.tagline || artist.bio.slice(0, 160),
    ogImage,
    url: canonicalUrl,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      name: artist.displayName,
      url: canonicalUrl,
      image: ogImage || undefined,
      description: artist.tagline,
      sameAs: artist.socials.map((s) => s.href),
    },
  });

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    const url = buildProfileShareUrl(canonicalSlug, "web_share");
    const title = `${artist.displayName} (@${canonicalSlug}) on UPLY`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url });
        trackEvent("profile_shared", { medium: "web_share", slug: canonicalSlug, method: "native_share" });
        setIsSharing(false);
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") { setIsSharing(false); return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
    setIsSharing(false);
  };

  const initials = artist.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const stats = (artist.stats || []).slice(0, 4);

  return (
    <main className="relative min-h-screen bg-background text-foreground pb-24">
      <div className="absolute top-3 left-3 z-30">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to UPLY"
          className="h-11 w-11 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Cover */}
      <div
        className="relative w-full h-44 sm:h-60"
        style={{
          background: `linear-gradient(135deg, ${artist.gradient.from}, ${artist.gradient.to})`,
        }}
      >
        {artist.portraitUrl && (
          <img
            src={artist.portraitUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="lazy"
          />
        )}
      </div>

      {/* Avatar */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 -mt-12 sm:-mt-14">
        <div
          className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-background overflow-hidden flex items-center justify-center text-2xl font-heading font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${artist.gradient.from}, ${artist.accent})` }}
        >
          {artist.portraitUrl ? (
            <img src={artist.portraitUrl} alt={artist.displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>

      {/* Identity */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight inline-flex items-center gap-2 min-w-0">
                <span className="truncate">{artist.displayName}</span>
                {artist.verified && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
              </h1>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share profile"
                className="shrink-0 h-11 w-11 -mt-1 rounded-full border border-border/60 bg-card/60 flex items-center justify-center hover:bg-card transition active:scale-95"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">@{canonicalSlug}</span>
              {artist.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {artist.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                {artist.eyebrow.split("·")[0].trim()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      {stats.length > 0 && (
        <nav aria-label="Profile stats" className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-4">
          <ul className={`grid gap-1 sm:gap-3 grid-cols-${stats.length}`} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
            {stats.map((s) => (
              <li key={s.k}>
                <div className="block text-center min-h-[44px] py-2 rounded-md">
                  <div className="font-heading font-semibold text-base sm:text-lg">{s.v}</div>
                  <div className="text-[11px] sm:text-xs uppercase tracking-wide text-muted-foreground">{s.k}</div>
                </div>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Bio */}
      <BioBlock
        bio={artist.bio}
        ctaLabel="Visit official site"
        ctaUrl={`${getSiteUrl()}/${artist.slug}-site`}
      />

      {/* Social icons */}
      {artist.socials.length > 0 && (
        <div className="flex justify-center gap-3 mt-4 px-4 flex-wrap">
          {artist.socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.kind] || Globe;
            return (
              <a
                key={`${s.kind}-${s.href}`}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-11 h-11 min-w-[44px] rounded-full flex items-center justify-center bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-6 grid gap-2 sm:grid-cols-2">
        <Link
          to={`/${artist.slug}`}
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted transition min-h-[56px]"
        >
          <div>
            <div className="font-semibold">Link in bio</div>
            <div className="text-xs text-muted-foreground">All links · socials · latest</div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to={`/${artist.slug}-site`}
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted transition min-h-[56px]"
        >
          <div>
            <div className="font-semibold">Official site</div>
            <div className="text-xs text-muted-foreground">Editorial · releases · booking</div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </Link>
        {artist.posts && artist.posts.length > 0 && (
          <Link
            to={`/${artist.slug}/blog`}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted transition min-h-[56px]"
          >
            <div>
              <div className="font-semibold">Blog</div>
              <div className="text-xs text-muted-foreground">{artist.posts.length} post{artist.posts.length === 1 ? "" : "s"}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
        {artist.community && (
          <Link
            to={`/${artist.slug}/community`}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted transition min-h-[56px]"
          >
            <div>
              <div className="font-semibold">{artist.community.name}</div>
              <div className="text-xs text-muted-foreground">{artist.community.membersLabel}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
        {artist.courses && artist.courses.length > 0 && (
          <Link
            to={`/${artist.slug}/courses`}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted transition min-h-[56px]"
          >
            <div>
              <div className="font-semibold">Courses</div>
              <div className="text-xs text-muted-foreground">{artist.courses.length} available</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* Releases */}
      {artist.releases && artist.releases.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-8">
          <h2 className="font-heading text-lg font-semibold mb-3">Releases</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {artist.releases.map((r) => {
              const Wrap: any = r.href ? "a" : "div";
              const wrapProps: any = r.href ? { href: r.href, target: "_blank", rel: "noopener noreferrer" } : {};
              return (
                <li key={`${r.title}-${r.year}`}>
                  <Wrap {...wrapProps} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted transition">
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.feat ? `${r.feat} · ` : ""}{r.year}</div>
                    </div>
                    {r.tag && <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary">{r.tag}</span>}
                  </Wrap>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
