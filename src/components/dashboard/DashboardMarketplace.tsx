import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Compass, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDiscoveryFeed, type FilterCategory } from "@/hooks/useDiscoveryFeed";
import FeedCard from "@/components/discovery/FeedCard";
import FeaturedCarousel from "@/components/discovery/FeaturedCarousel";

const PAGE_SIZE = 6;

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "community", label: "Communities" },
  { value: "course", label: "Courses" },
  { value: "creator", label: "Creators" },
  { value: "service", label: "Services" },
  { value: "livestream", label: "Live" },
];

export default function DashboardMarketplace() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: items, isLoading } = useDiscoveryFeed(filter, "trending", search, false);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, search]);

  const visibleItems = items?.slice(0, visibleCount) ?? [];
  const hasMore = items ? visibleCount < items.length : false;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (hasMore) setVisibleCount((p) => p + PAGE_SIZE);
  }, [hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search communities, courses, creators…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary/50 h-10"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Featured */}
      {filter === "all" && !search && <FeaturedCarousel />}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <div className="p-3 space-y-2">
                <div className="flex gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 bg-muted rounded" />
                    <div className="h-2.5 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleItems.map((item, i) => (
              <FeedCard key={`${item.type}-${item.id}`} item={item} index={i} />
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold mb-1">Nothing found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
        </motion.div>
      )}
    </div>
  );
}
