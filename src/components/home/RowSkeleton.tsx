interface RowSkeletonProps {
  /** card aspect: "video" = 16:9, "short" = 9:16, "square" = 1:1 */
  shape?: "video" | "short" | "square";
  count?: number;
  title?: string;
}

/**
 * Netflix-style row skeleton with shimmer (no white flash).
 * Matches Row.tsx dimensions so layout doesn't jump when real cards load.
 */
export default function RowSkeleton({ shape = "video", count = 4, title }: RowSkeletonProps) {
  const widthClass =
    shape === "short" ? "w-[150px]" : shape === "square" ? "w-[140px]" : "w-[280px]";
  const aspectClass =
    shape === "short" ? "aspect-[9/16]" : shape === "square" ? "aspect-square" : "aspect-video";

  return (
    <div className="px-4 lg:px-12">
      <div className="mb-3 flex items-end justify-between">
        {title ? (
          <h2 className="text-white text-[18px] font-bold tracking-tight">{title}</h2>
        ) : (
          <div className="h-5 w-40 rounded bg-[#1A1A1A] shimmer" />
        )}
        <div className="h-3 w-12 rounded bg-[#1A1A1A] shimmer" />
      </div>
      <div className="flex gap-3 overflow-hidden pr-8">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${widthClass} flex-shrink-0`}>
            <div className={`${aspectClass} w-full rounded-lg bg-[#1A1A1A] shimmer`} />
            <div className="mt-2 h-3 w-3/4 rounded bg-[#1A1A1A] shimmer" />
            <div className="mt-1.5 h-2.5 w-1/2 rounded bg-[#1A1A1A] shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
