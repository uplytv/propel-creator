interface Props {
  displayName: string;
  tagline?: string | null;
  heroImageUrl?: string | null;
  heroLogoUrl?: string | null;
  avatarUrl?: string | null;
}

/**
 * Editorial creator profile hero. Renders the artist/creator name in the
 * UPLY display serif with a gold accent on the final glyph, an eyebrow tag,
 * and an optional darkened cover image behind the lockup.
 */
export default function CreatorHero({
  displayName,
  tagline,
  heroImageUrl,
  heroLogoUrl,
  avatarUrl,
}: Props) {
  const trimmed = displayName.trim();
  const splitIdx = Math.max(1, trimmed.length - 2);
  const nameLead = trimmed.slice(0, splitIdx);
  const nameTail = trimmed.slice(splitIdx);

  return (
    <section className="relative isolate overflow-hidden">
      {heroImageUrl && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.88)), url(${heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {/* Gold + purple wash for cohesion */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(40% 60% at 80% 90%, hsl(var(--gold) / 0.10), transparent 70%)",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-12 text-center">
        {heroLogoUrl ? (
          <img src={heroLogoUrl} alt={displayName} className="mx-auto max-h-[160px] w-auto" />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-[hsl(var(--gold)/0.55)] ring-offset-4 ring-offset-background mb-5"
          />
        ) : null}

        <p className="eyebrow-gold mb-3">On UPLY · Verified Creator</p>

        <h1
          className="font-bold tracking-tight text-foreground"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: "clamp(36px, 8vw, 78px)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          <span>{nameLead}</span>
          <span className="text-gold">{nameTail}</span>
        </h1>

        {tagline && (
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {tagline}
          </p>
        )}

        {/* Editorial hairline */}
        <div
          className="mx-auto mt-8 h-px max-w-md"
          style={{ background: "var(--section-divider)" }}
          aria-hidden
        />
      </div>
    </section>
  );
}
