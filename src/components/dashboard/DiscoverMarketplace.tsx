import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Compass, Loader2, Users, BookOpen, TrendingUp, Flame, Crown, Star, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDiscoveryFeed, type FilterCategory, type SortOption } from "@/hooks/useDiscoveryFeed";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MyCommunities from "./MyCommunities";

const PAGE_SIZE = 10;

const FILTERS: { value: FilterCategory; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Compass },
  { value: "community", label: "Communities", icon: Users },
  { value: "course", label: "Courses", icon: BookOpen },
  { value: "creator", label: "Creators", icon: Crown },
];

const SORTS: { value: SortOption; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low" },
  { value: "price_high", label: "Price: High" },
];

export default function DiscoverMarketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [sort, setSort] = useState<SortOption>("trending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: items, isLoading } = useDiscoveryFeed(filter, sort, search, false);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, search, sort]);

  const allItems = items?.all ?? [];
  const visibleItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

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

  const getDestination = (item: any) => {
    switch (item.type) {
      case "livestream": return item.playbackId ? `/stream/${item.id}` : `/creator/${encodeURIComponent(item.creatorName)}`;
      case "course": return `/community/${item.creatorId}/classroom`;
      case "community": return `/community/${item.creatorId}/community`;
      case "creator": return `/creator/${encodeURIComponent(item.creatorName)}`;
      default: return `/creator/${encodeURIComponent(item.creatorName)}`;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "course": return "Enroll";
      case "community": return "Join";
      case "livestream": return "Watch";
      default: return "View";
    }
  };

  return (
    <div className="space-y-4">
      {/* My Communities */}
      <MyCommunities />

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
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <f.icon className="w-3 h-3" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              sort === s.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Results — Ranked List (Skool/Whop style) */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card animate-pulse">
              <div className="w-6 h-6 bg-muted rounded" />
              <div className="w-14 h-14 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length > 0 ? (
        <div className="space-y-2">
          {visibleItems.map((item, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            return (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(getDestination(item))}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                  isTop3
                    ? "border-primary/20 bg-primary/[0.03] hover:border-primary/40"
                    : "border-border bg-card hover:border-primary/20"
                }`}
              >
                {/* Rank */}
                <div className={`w-7 text-center flex-shrink-0 ${
                  rank === 1 ? "text-lg font-black text-primary" :
                  rank === 2 ? "text-base font-bold text-primary/70" :
                  rank === 3 ? "text-base font-bold text-primary/50" :
                  "text-sm font-semibold text-muted-foreground"
                }`}>
                  {rank <= 3 ? (
                    <div className="flex flex-col items-center">
                      <Flame className={`w-4 h-4 mb-0.5 ${rank === 1 ? "text-primary" : rank === 2 ? "text-primary/70" : "text-primary/50"}`} />
                      <span>{rank}</span>
                    </div>
                  ) : (
                    <span>#{rank}</span>
                  )}
                </div>

                {/* Image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : item.creatorAvatar ? (
                    <img src={item.creatorAvatar} alt={`${item.creatorName} avatar`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                      {item.type === "course" ? <BookOpen className="w-6 h-6 text-primary/40" /> :
                       item.type === "community" ? <Users className="w-6 h-6 text-primary/40" /> :
                       <Star className="w-6 h-6 text-primary/40" />}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                    {item.type === "course" && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-green/10 text-accent-green">COURSE</span>
                    )}
                    {item.type === "community" && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">COMMUNITY</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={item.creatorAvatar || undefined} />
                      <AvatarFallback className="text-[8px] bg-secondary">{item.creatorName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-muted-foreground truncate">{item.creatorName}</span>
                    {item.memberCount > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {item.memberCount.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price + Action */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-sm font-bold ${item.price > 0 ? "text-foreground" : "text-primary"}`}>
                    {item.price > 0 ? `$${item.price}` : "Free"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(getDestination(item)); }}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
                  >
                    {getActionLabel(item.type)}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
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
