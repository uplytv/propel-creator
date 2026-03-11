import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDiscoveryFeed, type FilterCategory, type SortOption } from "@/hooks/useDiscoveryFeed";
import FeedCard from "@/components/discovery/FeedCard";
import FeedFilters from "@/components/discovery/FeedFilters";
import BackNav from "@/components/BackNav";

export default function Discover() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [sort, setSort] = useState<SortOption>("trending");
  const [liveOnly, setLiveOnly] = useState(false);

  const { data: items, isLoading } = useDiscoveryFeed(filter, sort, search, liveOnly);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="container flex items-center gap-3 h-14 px-4">
          <BackNav />
          <Compass className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Discover</h1>
        </div>
      </header>

      <div className="container px-4 py-4 max-w-3xl space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators, courses, communities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50"
          />
        </div>

        {/* Filters */}
        <FeedFilters
          filter={filter}
          sort={sort}
          liveOnly={liveOnly}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onLiveOnlyChange={setLiveOnly}
        />

        {/* Feed */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
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
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item, i) => (
              <FeedCard key={`${item.type}-${item.id}`} item={item} index={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Nothing found</h3>
            <p className="text-sm text-muted-foreground">
              {liveOnly
                ? "No one is live right now. Try disabling the Live filter."
                : "Try adjusting your filters or search term."}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
