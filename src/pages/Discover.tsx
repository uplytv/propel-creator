import { useState, useEffect, useRef, useCallback, memo, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Radio, Upload, Film, BookOpen, Users, CalendarDays, X, ShoppingBag } from "lucide-react";
import LiveShoppingGrid from "@/components/discovery/LiveShoppingGrid";
import AppLayout from "@/components/layout/AppLayout";
import { useDiscoveryFeed, type SortOption, type FeedTab } from "@/hooks/useDiscoveryFeed";
import FeedCard from "@/components/discovery/FeedCard";
import FeedFilters, { type DiscoverCategory } from "@/components/discovery/FeedFilters";
import SearchSuggestions from "@/components/discovery/SearchSuggestions";
import EventDiscoveryGrid from "@/components/events/EventDiscoveryGrid";
import SEOHead from "@/components/SEOHead";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import NetworkBanner from "@/components/network/NetworkBanner";
import PrimetimeSection from "@/components/network/PrimetimeSection";
import TonightOnUPLY from "@/components/network/TonightOnUPLY";
import UPLYChannels from "@/components/network/UPLYChannels";
import FeaturedLearning from "@/components/discovery/FeaturedLearning";
import FeaturedRails from "@/components/FeaturedRails";

const PAGE_SIZE = 24;

// Map our new categories to existing filter types
function categoryToFilter(cat: DiscoverCategory) {
  switch (cat) {
    case "live": return "livestream" as const;
    case "videos": return "all" as const;
    case "shorts": return "all" as const;
    case "courses": return "course" as const;
    case "communities": return "community" as const;
    case "events": return "all" as const;
    default: return "all" as const;
  }
}

// Skeleton card component
const SkeletonCard = memo(forwardRef<HTMLDivElement>(function SkeletonCard(_, ref) {
  return (
    <div ref={ref} className="space-y-2.5">
      <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <div className="w-full h-full" style={{
          background: "linear-gradient(90deg, hsl(var(--card)) 25%, hsl(var(--card)/0.5) 50%, hsl(var(--card)) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }} />
      </div>
      <div className="flex gap-2.5">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full shrink-0" style={{
          background: "linear-gradient(90deg, hsl(var(--card)) 25%, hsl(var(--card)/0.5) 50%, hsl(var(--card)) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-4/5 rounded" style={{
            background: "linear-gradient(90deg, hsl(var(--card)) 25%, hsl(var(--card)/0.5) 50%, hsl(var(--card)) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }} />
          <div className="h-2.5 w-3/5 rounded" style={{
            background: "linear-gradient(90deg, hsl(var(--card)) 25%, hsl(var(--card)/0.5) 50%, hsl(var(--card)) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }} />
        </div>
      </div>
    </div>
  );
}));

(SkeletonCard as any).displayName = "SkeletonCard";

// Empty state component
function EmptyState({ category }: { category: DiscoverCategory }) {
  const config: Record<DiscoverCategory, { icon: React.ElementType; title: string; subtitle: string; cta?: string }> = {
    all: { icon: Compass, title: "Nothing here yet", subtitle: "Check back soon for new content." },
    live: { icon: Radio, title: "No one is live right now", subtitle: "Check back soon or follow creators to get notified." },
    shopping: { icon: ShoppingBag, title: "No live shopping right now", subtitle: "Creators selling live will appear here." },
    videos: { icon: Film, title: "No videos yet", subtitle: "Be the first to upload a video.", cta: "Upload" },
    shorts: { icon: Film, title: "No shorts yet", subtitle: "Short clips will appear here." },
    courses: { icon: BookOpen, title: "No courses yet", subtitle: "Creators are building courses — check back soon." },
    communities: { icon: Users, title: "No communities yet", subtitle: "Join the first community when it launches." },
    events: { icon: CalendarDays, title: "No upcoming events", subtitle: "Events will appear here when creators schedule them." },
  };
  const c = config[category];
  const Icon = c.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Icon className="w-8 h-8 text-muted-foreground mb-3" />
      <h3 className="text-base font-semibold text-foreground mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{c.title}</h3>
      <p className="text-[13px] text-muted-foreground text-center max-w-xs">{c.subtitle}</p>
      {c.cta && (
        <Button size="sm" variant="outline" className="mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          {c.cta}
        </Button>
      )}
    </div>
  );
}

export default function Discover() {
  const [category, setCategory] = useState<DiscoverCategory>("all");
  const [sort, setSort] = useState<SortOption>("trending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [transitioning, setTransitioning] = useState(false);
  const [dismissedLiveBanner, setDismissedLiveBanner] = useState<string | null>(null);

  const { user } = useAuth();
  const { followingIds } = useFollows();
  const navigate = useNavigate();

  const filter = categoryToFilter(category);
  const liveOnly = category === "live";
  const { data: feedData, isLoading } = useDiscoveryFeed(filter, sort, "", liveOnly, "foryou");

  const liveItems = feedData?.live ?? [];
  const allItems = feedData?.all ?? [];

  // Filter items based on category
  const filteredItems = (() => {
    if (category === "all") return allItems;
    if (category === "live") return liveItems;
    if (category === "videos") return allItems.filter(i => i.type === "video" || i.type === "recording");
    if (category === "shorts") return allItems.filter(i => i.type === "clip");
    if (category === "courses") return allItems.filter(i => i.type === "course");
    if (category === "communities") return allItems.filter(i => i.type === "community");
    return allItems;
  })();

  // Followed creator who is live
  const followedLiveCreator = liveItems.find(
    (item) => followingIds.includes(item.creatorId) && item.id !== dismissedLiveBanner
  );

  // Reset visible count on category/sort change with transition
  const handleCategoryChange = useCallback((c: DiscoverCategory) => {
    setTransitioning(true);
    setTimeout(() => {
      setCategory(c);
      setVisibleCount(PAGE_SIZE);
      setTransitioning(false);
    }, 150);
  }, []);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  // Infinite scroll with IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (hasMore) setVisibleCount((prev) => prev + PAGE_SIZE);
  }, [hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const showEvents = category === "events";
  const showShopping = category === "shopping";
  const showContent = !showEvents && !showShopping;
  const showSkeletons = isLoading || transitioning;

  return (
    <AppLayout>
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Discover Creators"
        description="Explore top creators, communities, courses, and live streams on Uply."
      />

      {/* Curated platform-wide feature (Arya XO blog this cycle) */}
      <FeaturedSpotlight variant="feed" />

      {/* AI Discover — featured classrooms & courses (replaces the old
          stories / going-out social strip) */}
      <FeaturedLearning />


      {/* Followed creator live banner */}
      <AnimatePresence>
        {followedLiveCreator && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderLeft: "2px solid #FF3B3B" }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
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

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          {/* Search */}
          <SearchSuggestions />
          {/* Category pills + sort */}
          <FeedFilters
            activeCategory={category}
            sort={sort}
            onCategoryChange={handleCategoryChange}
            onSortChange={setSort}
          />
        </div>
      </div>

      {/* Quick create row (logged-in) */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Button size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => navigate("/go-live")}>
              <Radio className="w-4 h-4" /> Go Live
            </Button>
            <Button size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => navigate("/camera")}>
              <Upload className="w-4 h-4" /> Upload
            </Button>
            <Button size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => navigate("/events/create")}>
              <CalendarDays className="w-4 h-4" /> Create Event
            </Button>
            <Button size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => navigate(`/community/${user.id}/classroom`)}>
              <BookOpen className="w-4 h-4" /> Add Course
            </Button>
          </div>
        </div>
      )}

      {/* Network Layer */}
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <NetworkBanner />
        <PrimetimeSection />
        <TonightOnUPLY />
        <UPLYChannels onChannelSelect={(cat) => handleCategoryChange("all" as DiscoverCategory)} />
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {showEvents ? (
          <EventDiscoveryGrid />
        ) : showShopping ? (
          <LiveShoppingGrid />
        ) : (
          <div
            className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}
          >
            {showSkeletons ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState category={category} />
            ) : (
              <>
                {/* Live section - special treatment */}
                {category === "all" && liveItems.length > 0 && (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
                      {liveItems.map((item, i) => (
                        <FeedCard key={`live-${item.id}`} item={item} index={i} isLiveSection />
                      ))}
                    </div>
                  </div>
                )}

                {/* Main grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
                  {visibleItems
                    .filter(item => category !== "all" || !item.isLive)
                    .map((item, i) => (
                      <FeedCard key={`${item.type}-${item.id}`} item={item} index={i} />
                    ))}
                </div>

                {/* Loading more skeleton */}
                {hasMore && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 mt-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonCard key={`loading-${i}`} />
                    ))}
                  </div>
                )}

                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {!hasMore && filteredItems.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    You've seen everything ✨
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
