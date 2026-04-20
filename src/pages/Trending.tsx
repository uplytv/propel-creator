import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Flame, Search as SearchIcon, Crown } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingSearches } from "@/hooks/useSearchEngine";
import { useDiscoveryAlgorithmFeed } from "@/hooks/useDiscoveryAlgorithmFeed";
import DiscoveryFeedCard from "@/components/discovery/DiscoveryFeedCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

function useTopCreatorsThisWeek() {
  return useQuery({
    queryKey: ["top-creators-week"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: events } = await supabase
        .from("watch_time_events")
        .select("content_id, content_type, watched_seconds, created_at")
        .gte("created_at", since).limit(5000);
      if (!events?.length) return [];
      // Map content -> creator via discovery scores (single fetch)
      const ids = Array.from(new Set(events.map((e: any) => e.content_id)));
      const { data: scores } = await supabase
        .from("video_discovery_scores")
        .select("content_id, creator_id").in("content_id", ids);
      const cMap = new Map((scores ?? []).map((s: any) => [s.content_id, s.creator_id]));
      const totals = new Map<string, number>();
      events.forEach((e: any) => {
        const cid = cMap.get(e.content_id); if (!cid) return;
        totals.set(cid, (totals.get(cid) ?? 0) + Number(e.watched_seconds || 0));
      });
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const { data: profiles } = await supabase
        .from("profiles_public").select("user_id, display_name, username, avatar_url")
        .in("user_id", top.map(([id]) => id));
      const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return top.map(([id, sec]) => ({ ...pMap.get(id), user_id: id, watch_seconds: sec }));
    },
    staleTime: 5 * 60_000,
  });
}

export default function Trending() {
  const { data: feed = [], isLoading } = useDiscoveryAlgorithmFeed("trending");
  const { data: searches = [] } = useTrendingSearches(5);
  const { data: creators = [] } = useTopCreatorsThisWeek();

  const top20 = feed.slice(0, 20);

  return (
    <AppLayout>
      <SEOHead title="Trending on UPLY" description="The hottest creators, videos, and searches on UPLY right now." />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        <header className="flex items-center gap-3">
          <Flame className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Trending</h1>
            <p className="text-sm text-muted-foreground">Updated every 30 minutes by the UPLY discovery engine.</p>
          </div>
        </header>

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Top 20 right now</h2>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : top20.length === 0 ? (
            <p className="text-muted-foreground text-sm">No trending content yet — be the first to upload!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {top20.map((it) => <DiscoveryFeedCard key={`${it.content_type}-${it.content_id}`} item={it} />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Crown className="w-5 h-5" /> Top creators this week</h2>
          {creators.length === 0 ? (
            <p className="text-muted-foreground text-sm">Watch-time data builds as people start watching.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {creators.map((c: any) => (
                <Link key={c.user_id} to={`/creator/${c.username || c.user_id}`} className="text-center group">
                  <Avatar className="w-16 h-16 mx-auto mb-2 ring-2 ring-transparent group-hover:ring-primary transition">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback>{c.display_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium truncate">{c.display_name}</div>
                  <div className="text-xs text-muted-foreground">{Math.floor(c.watch_seconds / 60)}m watched</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><SearchIcon className="w-5 h-5" /> Trending searches</h2>
          {searches.length === 0 ? (
            <p className="text-muted-foreground text-sm">No popular searches yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {searches.map((s: any) => (
                <Link key={s.term} to={`/search?q=${encodeURIComponent(s.term)}`}
                  className="px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 text-sm border border-border">
                  #{s.term} <span className="text-xs text-muted-foreground ml-1">{s.search_count}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
