import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { fetchProfileMap } from "@/lib/supabaseTyped";

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

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const walletId = wallet?.id;

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
        topVideosRes,
      ] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId).gte("created_at", thirtyDaysAgo),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId).gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", userId).gte("joined_at", thirtyDaysAgo),
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", userId).gte("joined_at", sixtyDaysAgo).lt("joined_at", thirtyDaysAgo),
        supabase.from("views_log").select("id", { count: "exact", head: true }).eq("asset_type", "stream").gte("viewed_at", thirtyDaysAgo),
        supabase.from("views_log").select("id", { count: "exact", head: true }).eq("asset_type", "stream").gte("viewed_at", sixtyDaysAgo).lt("viewed_at", thirtyDaysAgo),
        walletId
          ? supabase.from("transactions").select("amount, created_at").eq("wallet_id", walletId).eq("status", "completed").gte("created_at", thirtyDaysAgo)
          : Promise.resolve({ data: [] as { amount: number; created_at: string }[] }),
        walletId
          ? supabase.from("transactions").select("amount").eq("wallet_id", walletId).eq("status", "completed").gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo)
          : Promise.resolve({ data: [] as { amount: number }[] }),
        supabase.from("stream_recordings").select("id, title, view_count, playback_id").eq("creator_id", userId).eq("is_published", true).order("view_count", { ascending: false }).limit(5),
        supabase.from("follows").select("follower_id, created_at").eq("following_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("live_stream_sessions").select("started_at, ended_at, peak_viewers, total_watch_minutes").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
        supabase.from("videos").select("id, title, view_count, playback_id, thumbnail_url").eq("creator_id", userId).eq("is_public", true).order("view_count", { ascending: false }).limit(5),
      ]);

      const revenueData = (revenueRes.data ?? []) as { amount: number; created_at?: string }[];
      const revCurrent = revenueData.reduce((s, t) => s + (t.amount || 0), 0);
      const revPrevData = (revenuePrevRes.data ?? []) as { amount: number }[];
      const revPrev = revPrevData.reduce((s, t) => s + (t.amount || 0), 0);

      const calcGrowth = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      const dailyRevenue: Record<string, number> = {};
      for (const t of revenueData) {
        if (t.created_at) {
          const day = t.created_at.slice(0, 10);
          dailyRevenue[day] = (dailyRevenue[day] || 0) + (t.amount || 0);
        }
      }

      const followerIds = (recentFollowersRes.data ?? []).map((f) => f.follower_id);
      const profileMap = await fetchProfileMap(followerIds);

      const topContent = [
        ...(topContentRes.data ?? []).map((r) => ({ ...r, source: "recording" as const })),
        ...(topVideosRes.data ?? []).map((v) => ({ ...v, source: "video" as const })),
      ].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10);

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
        dailyRevenue,
        topContent,
        recentFollowers: (recentFollowersRes.data ?? []).map((f) => {
          const profile = profileMap.get(f.follower_id);
          return { ...f, display_name: profile?.display_name, avatar_url: profile?.avatar_url };
        }),
        streamSessions: streamSessionsRes.data ?? [],
      };
    },
  });
}
