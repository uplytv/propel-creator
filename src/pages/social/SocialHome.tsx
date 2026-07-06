import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { tables } from "@/lib/supabaseTyped";
import GoingOutWeekCard from "@/components/social/GoingOutWeekCard";
import StoriesRow from "@/components/social/StoriesRow";
import EventDiscoveryGrid from "@/components/social/EventDiscoveryGrid";
import SocialFeed from "@/components/social/SocialFeed";
import TrendingEventsWidget from "@/components/social/TrendingEventsWidget";
import LiveEventStreamsSection from "@/components/social/LiveEventStreamsSection";
import FeedToggle from "@/components/social/FeedToggle";
import SEOHead from "@/components/SEOHead";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function SocialHome() {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const [feed, setFeed] = useState<"for-you" | "following">("for-you");

  // Friends going out this week
  const { data: friendsGoingOut = [] } = useQuery({
    queryKey: ["friends-going-out", user?.id, followingIds],
    queryFn: async () => {
      if (!user || followingIds.length === 0) return [];
      const today = new Date().toISOString().split("T")[0];
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const { data } = await tables.attendance()
        .select("*, profiles:user_id(display_name, avatar_url, username), events:event_id(title)")
        .in("user_id", followingIds)
        .gte("attend_date", today)
        .lte("attend_date", weekEnd)
        .eq("status", "going")
        .limit(10);
      return data || [];
    },
    enabled: !!user && followingIds.length > 0,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return (
    <>
      <SEOHead title="Social — UPLY" description="Your social scene on UPLY" />
      <div className="pb-24">
        <FeedToggle value={feed} onChange={setFeed} />

        <StoriesRow />
        <GoingOutWeekCard />

        <LiveEventStreamsSection
          title="Going Off Right Now"
          filterFollowing
          followingIds={followingIds}
        />

        {friendsGoingOut.length > 0 && (
          <div className="px-4 py-3">
            <h3 className="text-sm font-bold text-foreground mb-2">
              {friendsGoingOut.length} friend{friendsGoingOut.length > 1 ? "s" : ""} going out this week
            </h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {friendsGoingOut.map((a: any) => (
                <div key={a.id} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 56 }}>
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={a.profiles?.avatar_url} />
                    <AvatarFallback className="bg-muted text-foreground text-[10px]">
                      {(a.profiles?.display_name || "U").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[56px]">{a.profiles?.display_name?.split(" ")[0]}</span>
                  <span className="text-[9px] text-muted-foreground/70">{format(new Date(a.attend_date), "EEE")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <TrendingEventsWidget />
        <EventDiscoveryGrid title="Events Near You" showSeeAll limit={6} />
        <SocialFeed friendsOnly={feed === "following"} />
      </div>
    </>
  );
}
