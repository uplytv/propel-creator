import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ShowTipLeader {
  show_id: string;
  fan_id: string;
  total_cents: number;
  tip_count: number;
  last_tip_at: string;
  rank: number;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function useShowTipLeaderboard(showId?: string, limit = 20) {
  return useQuery({
    queryKey: ["show-tip-leaderboard", showId, limit],
    queryFn: async () => {
      if (!showId) return [] as ShowTipLeader[];
      const { data } = await supabase
        .from("music_show_tip_leaderboard")
        .select("*")
        .eq("show_id", showId)
        .order("rank", { ascending: true })
        .limit(limit);
      const rows = (data as ShowTipLeader[]) ?? [];
      const fanIds = rows.map((r) => r.fan_id);
      if (fanIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id,display_name,avatar_url")
          .in("user_id", fanIds);
        const map = new Map<string, any>();
        (profiles ?? []).forEach((p: any) => map.set(p.user_id, p));
        rows.forEach((r) => {
          const p = map.get(r.fan_id);
          r.display_name = p?.display_name ?? null;
          r.avatar_url = p?.avatar_url ?? null;
        });
      }
      return rows;
    },
    enabled: !!showId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useSendShowTip() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      show_id: string;
      artist_id: string;
      amount_cents: number;
      currency?: string;
      message?: string;
    }) => {
      if (!user) throw new Error("Sign in to tip");
      const { data, error } = await supabase
        .from("music_show_tips")
        .insert({
          show_id: params.show_id,
          artist_id: params.artist_id,
          fan_id: user.id,
          amount_cents: params.amount_cents,
          currency: params.currency ?? "usd",
          message: params.message ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["show-tip-leaderboard", vars.show_id] });
    },
  });
}
