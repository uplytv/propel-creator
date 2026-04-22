import { Skeleton } from "@/components/ui/skeleton";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

interface Props {
  items: DiscoveryItem[];
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Netflix-style dense discovery grid.
 * - Tighter gaps + more columns at wide breakpoints (denser content tiles).
 * - Hover lifts the card and brings it above neighbors (no layout shift — uses transform + z-index).
 * - Keeps the same data contract and per-card component, so all functionality is preserved.
 */
export default function DiscoveryGrid({ items, isLoading, emptyMessage }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 px-3 md:px-6 py-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-muted-foreground text-sm">
          {emptyMessage ?? "Nothing here yet — check back soon."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 px-3 md:px-6 py-3">
      {items.map((item) => (
        <div
          key={`${item.content_type}-${item.content_id}`}
          className="relative transition-transform duration-300 ease-out hover:z-20 hover:scale-[1.06] focus-within:z-20 focus-within:scale-[1.06] origin-center"
        >
          <DiscoveryFeedCard item={item} />
        </div>
      ))}
    </div>
  );
}
