import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface TipJarGoal {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_cents: number;
  raised_cents: number;
  status: "active" | "reached" | "closed";
  ends_at: string | null;
}

export interface TipJarContribution {
  id: string;
  goal_id: string;
  fan_id: string;
  amount_cents: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export function useTipJarGoals(artistId?: string) {
  return useQuery({
    queryKey: ["tipjar-goals", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_tip_jar_goals").select("*").order("created_at", { ascending: false });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TipJarGoal[];
    },
    staleTime: 30_000,
  });
}

export function useTipJarGoal(id?: string) {
  return useQuery({
    queryKey: ["tipjar-goal", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tip_jar_goals")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as TipJarGoal | null;
    },
  });
}

export function useTipJarContributions(goalId?: string, limit = 50) {
  return useQuery({
    queryKey: ["tipjar-contributions", goalId, limit],
    enabled: !!goalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tip_jar_contributions")
        .select("*")
        .eq("goal_id", goalId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TipJarContribution[];
    },
    staleTime: 15_000,
  });
}

export function useContributeToTipJar() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      goal_id: string;
      amount_cents: number;
      message?: string;
      is_anonymous?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_tip_jar_contributions")
        .insert({
          goal_id: input.goal_id,
          fan_id: user.id,
          amount_cents: input.amount_cents,
          message: input.message ?? null,
          is_anonymous: input.is_anonymous ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TipJarContribution;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tipjar-contributions", vars.goal_id] });
      qc.invalidateQueries({ queryKey: ["tipjar-goal", vars.goal_id] });
      qc.invalidateQueries({ queryKey: ["tipjar-goals"] });
    },
  });
}
