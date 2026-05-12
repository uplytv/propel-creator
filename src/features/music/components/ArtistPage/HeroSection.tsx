interface Props {
  displayName: string;
  heroLogoUrl?: string | null;
  heroImageUrl?: string | null;
  tagline?: string | null;
}

export default function HeroSection({ displayName, heroLogoUrl, heroImageUrl, tagline }: Props) {
  return (
    <section className="relative">
      {heroImageUrl && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)), url(${heroImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-12 text-center">
        {heroLogoUrl ? (
          <img src={heroLogoUrl} alt={displayName} className="mx-auto max-h-[180px] w-auto" />
        ) : (
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(48px, 12vw, 128px)', letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            {displayName}
          </h1>
        )}
        {tagline && <p className="mt-4 text-lg opacity-70">{tagline}</p>}
      </div>
    </section>
  );
}
