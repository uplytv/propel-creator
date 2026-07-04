import { memo, useRef } from "react";
import { type SortOption } from "@/hooks/useDiscoveryFeed";
import { cn } from "@/lib/utils";

export type DiscoverCategory = "all" | "live" | "shopping" | "videos" | "shorts" | "courses" | "communities" | "events";

const categories: { value: DiscoverCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "shopping", label: "🛍️ Live Shopping" },
  { value: "videos", label: "Videos" },
  { value: "shorts", label: "Shorts" },
  { value: "courses", label: "Courses" },
  { value: "communities", label: "Communities" },
  { value: "events", label: "Events" },
];

const sorts: { value: SortOption; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "New" },
  { value: "popular", label: "Top" },
];

interface Props {
  activeCategory: DiscoverCategory;
  sort: SortOption;
  onCategoryChange: (c: DiscoverCategory) => void;
  onSortChange: (s: SortOption) => void;
}

const FeedFilters = memo(function FeedFilters({ activeCategory, sort, onCategoryChange, onSortChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center gap-2">
      {/* Category pills — horizontally scrollable */}
      <div
        ref={scrollRef}
        className="no-sb flex-1 min-w-0 flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`.no-sb::-webkit-scrollbar { display: none; }`}</style>
        {categories.map((cat) => {
          const active = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground",
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sort — always-visible segmented control (Skool-style ranking) */}
      <div className="shrink-0 flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
        {sorts.map((s) => {
          const active = sort === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onSortChange(s.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

FeedFilters.displayName = "FeedFilters";

export default FeedFilters;
