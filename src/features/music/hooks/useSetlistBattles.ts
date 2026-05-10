import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BattleChoice = "a" | "b";
export type BattleStatus = "open" | "closed" | "revealed";

export interface SetlistBattle {
  id: string;
  artist_id: string;
  title: string;
  show_date: string | null;
  option_a_label: string;
  option_b_label: string;
  option_a_tracks: string[];
  option_b_tracks: string[];
  votes_a: number;
  votes_b: number;
  status: BattleStatus;
  winner: "a" | "b" | "tie" | null;
  created_at: string;
  updated_at: string;
}

export function useSetlistBattles(artistId?: string) {
  return useQuery({
    queryKey: ["music-setlist-battles", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_setlist_battles" as never)
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SetlistBattle[];
    },
  });
}

export function useMyBattleVotes(artistId?: string) {
  return useQuery({
    queryKey: ["music-setlist-battle-votes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return new Map<string, BattleChoice>();
      const { data: battles } = await supabase
        .from("music_setlist_battles" as never)
        .select("id")
        .eq("artist_id", artistId!);
      const ids = ((battles || []) as Array<{ id: string }>).map((b) => b.id);
      if (!ids.length) return new Map<string, BattleChoice>();
      const { data, error } = await supabase
        .from("music_setlist_battle_votes" as never)
        .select("battle_id,choice")
        .eq("fan_id", uid)
        .in("battle_id", ids);
      if (error) throw error;
      const m = new Map<string, BattleChoice>();
      for (const v of (data || []) as Array<{ battle_id: string; choice: BattleChoice }>) {
        m.set(v.battle_id, v.choice);
      }
      return m;
    },
  });
}

export function useCreateSetlistBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      show_date?: string | null;
      option_a_label: string;
      option_b_label: string;
      option_a_tracks?: string[];
      option_b_tracks?: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_setlist_battles" as never)
        .insert({
          artist_id: uid,
          title: input.title,
          show_date: input.show_date ?? null,
          option_a_label: input.option_a_label,
          option_b_label: input.option_b_label,
          option_a_tracks: input.option_a_tracks ?? [],
          option_b_tracks: input.option_b_tracks ?? [],
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SetlistBattle;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["music-setlist-battles"] }),
  });
}

export function useCastBattleVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { battle_id: string; choice: BattleChoice; current?: BattleChoice | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      if (input.current === input.choice) return;
      if (input.current) {
        const { error } = await supabase
          .from("music_setlist_battle_votes" as never)
          .update({ choice: input.choice } as never)
          .eq("battle_id", input.battle_id)
          .eq("fan_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("music_setlist_battle_votes" as never)
          .insert({ battle_id: input.battle_id, fan_id: uid, choice: input.choice } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-setlist-battles"] });
      qc.invalidateQueries({ queryKey: ["music-setlist-battle-votes"] });
    },
  });
}
