interface Props {
  displayName: string;
  tagline?: string | null;
  heroImageUrl?: string | null;
  heroLogoUrl?: string | null;
  avatarUrl?: string | null;
}

export default function CreatorHero({ displayName, tagline, heroImageUrl, heroLogoUrl, avatarUrl }: Props) {
  return (
    <section className="relative">
      {heroImageUrl && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.85)), url(${heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-10 text-center">
        {heroLogoUrl ? (
          <img src={heroLogoUrl} alt={displayName} className="mx-auto max-h-[160px] w-auto" />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-primary/30 mb-4"
          />
        ) : null}
        <h1
          className="font-heading font-bold tracking-tight text-foreground"
          style={{ fontSize: "clamp(36px, 8vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          {displayName}
        </h1>
        {tagline && <p className="mt-3 text-base md:text-lg text-muted-foreground">{tagline}</p>}
      </div>
    </section>
  );
}
