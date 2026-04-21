/**
 * PageSkeleton — shared premium dark-mode loading skeleton.
 *
 * Used by RootRoute, Home, and any other top-level route that needs a
 * full-page loading state. Each placeholder block uses a subtle moving
 * shimmer with a brand electric-green tint to match the app's style.
 */

interface PageSkeletonProps {
  rows?: number;
  tilesPerRow?: number;
  showHero?: boolean;
  showNavbar?: boolean;
  className?: string;
}

interface BlockProps {
  className?: string;
  /** Disable the moving shimmer (e.g. for very small dots). */
  noShimmer?: boolean;
}

/**
 * Single shimmering placeholder block. Built on top of a soft white base with
 * a translating gradient overlay that picks up a touch of #00FF85 at the peak.
 */
const Block = ({ className = "", noShimmer = false }: BlockProps) => (
  <div
    className={`relative overflow-hidden bg-white/[0.06] ${className}`}
  >
    {!noShimmer && (
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"
        // Layer a faint green glow on top of the white sweep for brand flavor.
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 45%, rgba(0,255,133,0.12) 50%, rgba(255,255,255,0.10) 55%, transparent 100%)",
        }}
      />
    )}
  </div>
);

export const PageSkeleton = ({
  rows = 3,
  tilesPerRow = 6,
  showHero = true,
  showNavbar = true,
  className = "",
}: PageSkeletonProps) => (
  <div
    className={`min-h-screen bg-[#0A0A0A] text-white ${className}`}
    aria-busy="true"
    aria-live="polite"
    role="status"
  >
    {showNavbar && (
      <div className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Block className="h-7 w-7 rounded-md" />
          <Block className="h-4 w-20 rounded" />
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Block className="h-3 w-12 rounded" />
          <Block className="h-3 w-12 rounded" />
          <Block className="h-3 w-12 rounded" />
        </div>
        <Block className="h-9 w-9 rounded-full" />
      </div>
    )}

    {showHero && (
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent" />
        {/* Subtle electric-green ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,255,133,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end px-6 lg:px-12 pb-16 gap-4 max-w-2xl">
          <Block className="h-3 w-24 rounded" />
          <Block className="h-10 w-3/4 rounded" />
          <Block className="h-10 w-1/2 rounded" />
          <Block className="h-4 w-full max-w-md rounded" />
          <div className="flex gap-3 pt-2">
            <Block className="h-11 w-32 rounded-full" />
            <Block className="h-11 w-28 rounded-full" />
          </div>
        </div>
      </div>
    )}

    <div
      className={`relative z-10 flex flex-col gap-14 pb-20 ${
        showHero ? "-mt-16" : "pt-10"
      }`}
    >
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="px-6 lg:px-12">
          <div className="mb-4 space-y-2">
            <Block className="h-5 w-40 rounded" />
            <Block className="h-3 w-64 rounded" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: tilesPerRow }).map((_, tile) => (
              <Block
                key={tile}
                className="h-44 w-72 shrink-0 rounded-xl"
              />
            ))}
          </div>
        </div>
      ))}
    </div>

    <span className="sr-only">Loading…</span>
  </div>
);

export default PageSkeleton;
