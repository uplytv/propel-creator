import { memo, useState, useRef } from "react";
import { ArrowUpDown, Check } from "lucide-react";
import { type FilterCategory, type SortOption } from "@/hooks/useDiscoveryFeed";
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
  { value: "popular", label: "Popular" },
];

interface Props {
  activeCategory: DiscoverCategory;
  sort: SortOption;
  onCategoryChange: (c: DiscoverCategory) => void;
  onSortChange: (s: SortOption) => void;
}

const FeedFilters = memo(function FeedFilters({ activeCategory, sort, onCategoryChange, onSortChange }: Props) {
  const [sortOpen, setSortOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center gap-2">
      {/* Category pills - horizontally scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-2 overflow-x-auto"
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
                "shrink-0 px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150",
                "rounded-md",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sort dropdown button */}
      <div className="relative shrink-0">
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>

        {sortOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
            <div className="absolute top-10 right-0 w-36 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden">
              {sorts.map((s) => {
                const active = sort === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => { onSortChange(s.value); setSortOpen(false); }}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2.5 text-sm transition-colors hover:bg-secondary/50",
                      active ? "text-primary" : "text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {active && <span className="w-0.5 h-4 bg-primary rounded-full" />}
                      {s.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

FeedFilters.displayName = "FeedFilters";

export default FeedFilters;
