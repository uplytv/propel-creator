import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ListeningStreak {
  id: string;
  fan_id: string;
  artist_id: string;
  current_streak: number;
  longest_streak: number;
  last_listen_date: string | null;
  total_days: number;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

export function useMyListeningStreak(artistId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["listening-streak-mine", artistId, user?.id],
    enabled: !!artistId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_listening_streaks")
        .select("*")
        .eq("artist_id", artistId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ListeningStreak | null;
    },
  });
}

export function useTopListeningStreaks(artistId?: string, limit = 25) {
  return useQuery({
    queryKey: ["listening-streak-top", artistId, limit],
    enabled: !!artistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_listening_streaks")
        .select("*")
        .eq("artist_id", artistId!)
        .order("current_streak", { ascending: false })
        .order("longest_streak", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ListeningStreak[];
    },
    staleTime: 60_000,
  });
}

export function useRecordListeningDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (artist_id: string) => {
      const { data, error } = await supabase.rpc("record_listening_day", {
        _artist_id: artist_id,
      });
      if (error) throw error;
      return data as ListeningStreak;
    },
    onSuccess: (_d, artist_id) => {
      qc.invalidateQueries({ queryKey: ["listening-streak-mine", artist_id] });
      qc.invalidateQueries({ queryKey: ["listening-streak-top", artist_id] });
    },
  });
}

export function nextStreakMilestone(current: number) {
  return STREAK_MILESTONES.find((m) => m > current) ?? null;
}
