import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  score: number;
  rank: number | null;
  streak_days: number;
  display_name: string | null;
  avatar_url: string | null;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from("leaderboard_entries")
        .select("*")
        .order("score", { ascending: false })
        .limit(50);
      if (error) throw error;

      if (!entries || entries.length === 0) return [];

      const userIds = entries.map((e: any) => e.user_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return entries.map((e: any, i: number) => ({
        ...e,
        rank: i + 1,
        display_name: (profileMap.get(e.user_id) as any)?.display_name || "Creator",
        avatar_url: (profileMap.get(e.user_id) as any)?.avatar_url || null,
      }));
    },
  });
}
