/**
 * DefaultCommunityCover — branded fallback cover for communities that have
 * no cover image and no gallery media. Pure CSS/JSX (brand gradient tokens
 * --gradient-start → --gradient-mid via .bg-brand-gradient), no image assets.
 *
 * Fills its parent — wrap it in a sized container (e.g. aspect-video).
 */
interface DefaultCommunityCoverProps {
  name: string;
  className?: string;
}

export default function DefaultCommunityCover({ name, className = "" }: DefaultCommunityCoverProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-none bg-brand-gradient ${className}`}
    >
      {/* Subtle depth layers — light bloom top-left, shade bottom-right */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.16),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.18),transparent_60%)]" />

      {/* Community name */}
      <span
        className="relative z-10 max-w-[85%] px-4 text-center text-xl font-bold leading-snug text-white line-clamp-3 sm:text-2xl"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {name}
      </span>

      {/* Subtle UPLY wordmark */}
      <span className="absolute bottom-2.5 right-3 z-10 text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/55">
        UPLY
      </span>
    </div>
  );
}
