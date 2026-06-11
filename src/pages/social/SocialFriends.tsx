import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import StoriesRow from "@/components/social/StoriesRow";
import FriendRequestsSection from "@/components/social/FriendRequestsSection";
import OutgoingFriendRequestsSection from "@/components/social/OutgoingFriendRequestsSection";
import PeopleYouMayKnowSection from "@/components/social/PeopleYouMayKnowSection";
import HangoutMatchSection from "@/components/social/HangoutMatchSection";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedItem {
  id: string;
  type: "attendance" | "story" | "post";
  user: { display_name: string; avatar_url: string | null; username: string | null };
  text: string;
  subtext?: string;
  created_at: string;
  event_title?: string;
  event_id?: string;
  media_url?: string;
}

export default function SocialFriends() {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const navigate = useNavigate();

  const { data: feedItems = [], isLoading } = useQuery({
    queryKey: ["friends-feed", user?.id, followingIds],
    queryFn: async () => {
      if (!user || followingIds.length === 0) return [];
      const items: FeedItem[] = [];

      // 1. Attendance from friends
      const { data: attendance } = await (supabase as any)
        .from("attendance")
        .select("*, profiles:user_id(display_name, avatar_url, username), events:event_id(title)")
        .in("user_id", followingIds)
        .gte("attend_date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false })
        .limit(20);

      (attendance || []).forEach((a: any) => {
        const eventName = a.events?.title || format(new Date(a.attend_date), "EEEE");
        items.push({
          id: `att-${a.id}`,
          type: "attendance",
          user: a.profiles,
          text: `${a.status === "going" ? "is going out" : "might go out"} on ${format(new Date(a.attend_date), "EEE M/d")}`,
          subtext: a.events?.title ? `→ ${a.events.title}` : undefined,
          created_at: a.created_at,
          event_title: a.events?.title,
          event_id: a.event_id,
        });
      });

      // 2. Stories from friends
      const { data: stories } = await (supabase as any)
        .from("stories")
        .select("*, profiles:user_id(display_name, avatar_url, username)")
        .in("user_id", followingIds)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Dedupe by user
      const seenUsers = new Set<string>();
      (stories || []).forEach((s: any) => {
        if (seenUsers.has(s.user_id)) return;
        seenUsers.add(s.user_id);
        items.push({
          id: `story-${s.id}`,
          type: "story",
          user: s.profiles,
          text: "posted a story",
          created_at: s.created_at,
          media_url: s.media_url,
        });
      });

      // 3. Social posts from friends
      const { data: posts } = await (supabase as any)
        .from("social_posts")
        .select("*, profiles:user_id(display_name, avatar_url, username), events:event_id(title)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(20);

      (posts || []).forEach((p: any) => {
        items.push({
          id: `post-${p.id}`,
          type: "post",
          user: p.profiles,
          text: p.content || "shared a post",
          subtext: p.events?.title ? `→ ${p.events.title}` : undefined,
          created_at: p.created_at,
          media_url: p.media_urls?.[0],
        });
      });

      // Sort by date
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items;
    },
    enabled: !!user && followingIds.length > 0,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return (
    <>
      <SEOHead title="Friends — UPLY" description="See what your friends are up to" />
      <div className="pb-20">
        <StoriesRow filterFriends />

        <FriendRequestsSection />
        <OutgoingFriendRequestsSection />
        <HangoutMatchSection />
        <PeopleYouMayKnowSection />

        {isLoading ? (
          <div className="space-y-3 px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <span className="text-5xl mb-4">👥</span>
            <p className="text-white font-bold text-lg mb-2">Follow people to see what they're up to</p>
            <p className="text-white/50 text-sm mb-6">Their activity will show up here</p>
            <button
              onClick={() => navigate("/social/people")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-transform active:scale-95"
              style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}
            >
              Go to People tab →
            </button>
          </div>
        ) : (
          <div className="space-y-2 px-4 py-3">
            {feedItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl p-3 transition-transform active:scale-[0.98]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={item.user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-white/10 text-white text-xs">
                      {(item.user?.display_name || "U").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-semibold">{item.user?.display_name}</span>{" "}
                      <span className="text-white/60">{item.text}</span>
                    </p>
                    {item.subtext && (
                      <p className="text-xs mt-0.5" style={{ color: "#00FF85" }}>
                        {item.subtext}
                      </p>
                    )}
                    <p className="text-[10px] text-white/30 mt-1">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {item.type === "attendance" && (
                    <span className="text-lg flex-shrink-0">📅</span>
                  )}
                  {item.type === "story" && item.media_url && (
                    <img
                      src={item.media_url}
                      className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
                      alt=""
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
