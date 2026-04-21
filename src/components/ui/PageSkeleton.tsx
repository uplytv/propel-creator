/**
 * PageSkeleton — shared premium dark-mode loading skeleton.
 *
 * Used by RootRoute, Home, and any other top-level route that needs a
 * full-page loading state. Mirrors the rough layout of a navbar + hero +
 * content rows so the eventual content swap feels seamless.
 */

interface PageSkeletonProps {
  /** Number of horizontal content rows to render. Defaults to 3. */
  rows?: number;
  /** Number of card tiles per row. Defaults to 6. */
  tilesPerRow?: number;
  /** Render the hero block. Defaults to true. */
  showHero?: boolean;
  /** Render the navbar block. Defaults to true. */
  showNavbar?: boolean;
  className?: string;
}

export const PageSkeleton = ({
  rows = 3,
  tilesPerRow = 6,
  showHero = true,
  showNavbar = true,
  className = "",
}: PageSkeletonProps) => (
  <div
    className={`min-h-screen bg-[#0A0A0A] text-white animate-pulse ${className}`}
    aria-busy="true"
    aria-live="polite"
    role="status"
  >
    {showNavbar && (
      <div className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-white/10" />
          <div className="h-4 w-20 rounded bg-white/10" />
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="h-3 w-12 rounded bg-white/10" />
          <div className="h-3 w-12 rounded bg-white/10" />
          <div className="h-3 w-12 rounded bg-white/10" />
        </div>
        <div className="h-9 w-9 rounded-full bg-white/10" />
      </div>
    )}

    {showHero && (
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end px-6 lg:px-12 pb-16 gap-4 max-w-2xl">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-10 w-3/4 rounded bg-white/10" />
          <div className="h-10 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-full max-w-md rounded bg-white/10" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 rounded-full bg-white/10" />
            <div className="h-11 w-28 rounded-full bg-white/10" />
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
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/10" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: tilesPerRow }).map((_, tile) => (
              <div
                key={tile}
                className="h-44 w-72 shrink-0 rounded-xl bg-white/[0.06]"
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
