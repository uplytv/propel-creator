import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipGoalStatus = "draft" | "active" | "reached" | "closed";

export interface TipGoal {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  goal_cents: number;
  raised_cents: number;
  contributor_count: number;
  status: TipGoalStatus;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TipContribution {
  id: string;
  goal_id: string;
  fan_id: string;
  amount_cents: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export function useTipGoals(artistId?: string) {
  return useQuery({
    queryKey: ["music-tip-goals", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<TipGoal[]> => {
      const { data, error } = await supabase
        .from("music_tip_goals")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TipGoal[];
    },
  });
}

export function useTipGoal(id?: string) {
  return useQuery({
    queryKey: ["music-tip-goal", id],
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async (): Promise<TipGoal | null> => {
      const { data, error } = await supabase
        .from("music_tip_goals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TipGoal | null;
    },
  });
}

export function useTipContributions(goalId?: string) {
  return useQuery({
    queryKey: ["music-tip-contributions", goalId],
    enabled: !!goalId,
    staleTime: 15_000,
    queryFn: async (): Promise<TipContribution[]> => {
      const { data, error } = await supabase
        .from("music_tip_contributions")
        .select("*")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as TipContribution[];
    },
  });
}

export function useContributeToGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      goal_id: string;
      amount_cents: number;
      message?: string;
      is_anonymous?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_tip_contributions")
        .insert({
          goal_id: input.goal_id,
          fan_id: u.user.id,
          amount_cents: Math.max(1, Math.floor(input.amount_cents)),
          message: input.message ?? null,
          is_anonymous: !!input.is_anonymous,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as TipContribution;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-tip-goal", row.goal_id] });
      qc.invalidateQueries({ queryKey: ["music-tip-contributions", row.goal_id] });
      qc.invalidateQueries({ queryKey: ["music-tip-goals"] });
    },
  });
}
