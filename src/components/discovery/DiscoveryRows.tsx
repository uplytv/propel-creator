import { useDiscoveryAlgorithmFeed, type DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";
import HoverPreviewCard from "./HoverPreviewCard";
import DiscoverRow from "@/components/discover/DiscoverRow";
import { Skeleton } from "@/components/ui/skeleton";

interface RowProps {
  title: string;
  subtitle?: string;
  items: DiscoveryItem[];
  isLoading?: boolean;
}

function CarouselRow({ title, subtitle, items, isLoading }: RowProps) {
  if (!isLoading && !items.length) return null;
  return (
    <DiscoverRow title={title} subtitle={subtitle}>
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="shrink-0 snap-start w-[260px] md:w-[320px] aspect-video rounded-md"
            />
          ))
        : items.map((item) => (
            <div
              key={`${item.content_type}-${item.content_id}`}
              className="shrink-0 snap-start w-[260px] md:w-[320px] transition-transform duration-300 ease-out hover:scale-[1.06] hover:z-20 origin-center"
            >
              <HoverPreviewCard item={item} />
            </div>
          ))}
    </DiscoverRow>
  );
}

/**
 * Netflix-style horizontal carousels grouped into rows.
 * Reuses the existing discovery data hook + filters — no new endpoints.
 * All three rows respect the same `category` and `tags` filters so the
 * Trending / New / Recommended carousels stay in sync with the active selection.
 */
export default function DiscoveryRows({
  category,
  tags,
}: {
  category?: string;
  tags?: string[];
}) {
  const trending = useDiscoveryAlgorithmFeed("trending", category, tags);
  const fresh = useDiscoveryAlgorithmFeed("new", category, tags);
  const forYou = useDiscoveryAlgorithmFeed("for-you", category, tags);

  return (
    <div className="space-y-5 md:space-y-7 py-3">
      <CarouselRow
        title="🔥 Trending Now"
        subtitle="What everyone's watching"
        items={trending.data ?? []}
        isLoading={trending.isLoading}
      />
      <CarouselRow
        title="✨ New & Rising"
        subtitle="Fresh from emerging creators"
        items={fresh.data ?? []}
        isLoading={fresh.isLoading}
      />
      <CarouselRow
        title="🎯 Recommended For You"
        subtitle="Picked based on your taste"
        items={forYou.data ?? []}
        isLoading={forYou.isLoading}
      />
    </div>
  );
}
