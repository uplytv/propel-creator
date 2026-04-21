import { Skeleton } from "@/components/ui/skeleton";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

interface Props {
  items: DiscoveryItem[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function DiscoveryGrid({ items, isLoading, emptyMessage }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video w-full rounded-lg" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {items.map((item) => (
        <DiscoveryFeedCard key={`${item.content_type}-${item.content_id}`} item={item} />
      ))}
    </div>
  );
}
