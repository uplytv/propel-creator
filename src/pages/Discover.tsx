import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, Loader2, Radio, Zap, Flame, X, Eye, Users as UsersIcon, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDiscoveryFeed, type FilterCategory, type SortOption, type FeedTab } from "@/hooks/useDiscoveryFeed";
import EventDiscoveryGrid from "@/components/events/EventDiscoveryGrid";
import FeedCard from "@/components/discovery/FeedCard";
import FeedFilters from "@/components/discovery/FeedFilters";
import FeaturedCarousel from "@/components/discovery/FeaturedCarousel";
import CategoryHeroBanner from "@/components/discovery/CategoryHeroBanner";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 8;

export default function Discover() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [sort, setSort] = useState<SortOption>("trending");
  const [liveOnly, setLiveOnly] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab | "events">("foryou");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [dismissedLiveBanner, setDismissedLiveBanner] = useState<string | null>(null);

  const { user } = useAuth();
  const { followingIds } = useFollows();
  const navigate = useNavigate();

  const actualFeedTab = feedTab === "events" ? "foryou" : feedTab;
  const { data: feedData, isLoading } = useDiscoveryFeed(filter, sort, search, liveOnly, actualFeedTab);

  const liveItems = feedData?.live ?? [];
  const newItems = feedData?.new ?? [];
  const trendingItems = feedData?.trending ?? [];
  const allItems = feedData?.all ?? [];
  const liveCount = feedData?.liveCount ?? 0;

  // Find followed creator who is live
  const followedLiveCreator = liveItems.find(
    (item) => followingIds.includes(item.creatorId) && item.id !== dismissedLiveBanner
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, sort, search, liveOnly, feedTab]);

  const visibleItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (hasMore) setVisibleCount((prev) => prev + PAGE_SIZE);
  }, [hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Skeleton loader
  const SkeletonCards = () => (
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
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Discover Creators"
        description="Explore top creators, communities, courses, and live streams on Uply. Find creators to follow and learn from."
      />

      {/* Followed creator live banner */}
      <AnimatePresence>
        {followedLiveCreator && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sticky top-0 z-40 overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: "#0A0A0A",
                borderLeft: "3px solid hsl(var(--primary))",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#FF3B3B] animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">
                  {followedLiveCreator.creatorName} is LIVE
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => navigate(`/stream/${followedLiveCreator.id}`)}
                  className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 h-7"
                >
                  Watch Now
                </Button>
                <button
                  onClick={() => setDismissedLiveBanner(followedLiveCreator.id)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="container flex items-center gap-3 h-14 px-4">
          <BackNav />
          <Compass className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Discover</h1>
        </div>
      </header>

      <div className="container px-4 py-4 max-w-3xl space-y-4">
        {/* Feed tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
          {(["foryou", "following", "events"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFeedTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                feedTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "foryou" ? "For You" : tab === "following" ? "Following" : "Events"}
            </button>
          ))}
        </div>

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

        {feedTab === "events" ? (
          <EventDiscoveryGrid />
        ) : (
        <>
        {/* Staff Picks / Category Hero */}
        {filter === "all" && !search && feedTab === "foryou" && <FeaturedCarousel />}
        {filter !== "all" && <CategoryHeroBanner category={filter} />}

        {isLoading ? (
          <SkeletonCards />
        ) : feedTab === "following" && followingIds.length === 0 ? (
          /* Following empty state */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <UsersIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Follow creators to see their content here</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discover amazing creators and follow them to build your personal feed.
            </p>
            <Button onClick={() => { setFeedTab("foryou"); setFilter("creator"); }} className="bg-primary text-primary-foreground">
              Browse Creators
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* LIVE SECTION */}
            {liveItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF3B3B] animate-pulse" />
                    <h2 className="text-base font-bold text-foreground">Live Now</h2>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {liveCount} stream{liveCount !== 1 ? "s" : ""} live
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {liveItems.map((item, i) => (
                    <FeedCard key={`live-${item.id}`} item={item} index={i} isLiveSection />
                  ))}
                </div>
              </section>
            )}

            {/* NEW SECTION */}
            {newItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">New</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newItems.slice(0, visibleCount - liveItems.length).map((item, i) => (
                    <FeedCard key={`new-${item.type}-${item.id}`} item={item} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* TRENDING SECTION */}
            {trendingItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h2 className="text-base font-bold text-foreground">Trending</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trendingItems.slice(0, Math.max(0, visibleCount - liveItems.length - newItems.length)).map((item, i) => (
                    <FeedCard key={`trend-${item.type}-${item.id}`} item={item} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* No results */}
            {allItems.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-1">Nothing found</h3>
                <p className="text-sm text-muted-foreground">
                  {liveOnly ? "No one is live right now. Try disabling the Live filter." : "Try adjusting your filters or search term."}
                </p>
              </motion.div>
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!hasMore && allItems.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground py-4">
                You've seen everything ✨
              </p>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
