import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useCreatorAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["creator-analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const userId = user!.id;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const [
        followersRes,
        followersPrevRes,
        membersRes,
        membersPrevRes,
        viewsRes,
        viewsPrevRes,
        revenueRes,
        revenuePrevRes,
        topContentRes,
        recentFollowersRes,
        streamSessionsRes,
      ] = await Promise.all([
        // Followers last 30d
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId).gte("created_at", thirtyDaysAgo),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId).gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
        // Members last 30d
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", userId).gte("joined_at", thirtyDaysAgo),
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", userId).gte("joined_at", sixtyDaysAgo).lt("joined_at", thirtyDaysAgo),
        // Views last 30d
        supabase.from("views_log").select("id", { count: "exact", head: true }).eq("asset_type", "stream").gte("viewed_at", thirtyDaysAgo),
        supabase.from("views_log").select("id", { count: "exact", head: true }).eq("asset_type", "stream").gte("viewed_at", sixtyDaysAgo).lt("viewed_at", thirtyDaysAgo),
        // Revenue last 30d
        supabase.from("transactions").select("amount").eq("status", "completed").gte("created_at", thirtyDaysAgo),
        supabase.from("transactions").select("amount").eq("status", "completed").gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
        // Top content
        supabase.from("stream_recordings").select("id, title, view_count, playback_id").eq("creator_id", userId).eq("is_published", true).order("view_count", { ascending: false }).limit(5),
        // Recent followers
        supabase.from("follows").select("follower_id, created_at").eq("following_id", userId).order("created_at", { ascending: false }).limit(10),
        // Stream sessions
        supabase.from("live_stream_sessions").select("started_at, ended_at, peak_viewers, total_watch_minutes").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
      ]);

      const revCurrent = (revenueRes.data ?? []).reduce((s, t) => s + (t.amount || 0), 0);
      const revPrev = (revenuePrevRes.data ?? []).reduce((s, t) => s + (t.amount || 0), 0);

      const calcGrowth = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      // Get follower profiles for recent followers
      const followerIds = (recentFollowersRes.data ?? []).map((f) => f.follower_id);
      const { data: followerProfiles } = followerIds.length > 0
        ? await supabase.from("profiles_public" as any).select("user_id, display_name, avatar_url").in("user_id", followerIds)
        : { data: [] };

      return {
        metrics: {
          newFollowers: followersRes.count || 0,
          followerGrowth: calcGrowth(followersRes.count || 0, followersPrevRes.count || 0),
          newMembers: membersRes.count || 0,
          memberGrowth: calcGrowth(membersRes.count || 0, membersPrevRes.count || 0),
          views: viewsRes.count || 0,
          viewsGrowth: calcGrowth(viewsRes.count || 0, viewsPrevRes.count || 0),
          revenue: revCurrent,
          revenueGrowth: calcGrowth(revCurrent, revPrev),
        },
        topContent: topContentRes.data ?? [],
        recentFollowers: (recentFollowersRes.data ?? []).map((f) => {
          const profile = (followerProfiles ?? []).find((p) => p.user_id === f.follower_id);
          return { ...f, display_name: profile?.display_name, avatar_url: profile?.avatar_url };
        }),
        streamSessions: streamSessionsRes.data ?? [],
      };
    },
  });
}
