import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface FanPointsRow {
  id: string;
  artist_id: string;
  fan_id: string;
  points: number;
  listens: number;
  tips_cents: number;
  dedications_count: number;
  last_event_at: string;
}

export type FanPointSource =
  | "listen"
  | "tip"
  | "dedication"
  | "preorder"
  | "ppv"
  | "ama"
  | "setlist"
  | "other";

export function useTopFans(artistId?: string, limit = 25) {
  return useQuery({
    queryKey: ["top-fans", artistId, limit],
    enabled: !!artistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_fan_points")
        .select("*")
        .eq("artist_id", artistId!)
        .order("points", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as FanPointsRow[];
    },
    staleTime: 30_000,
  });
}

export function useMyFanRank(artistId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-fan-rank", artistId, user?.id],
    enabled: !!artistId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_fan_points")
        .select("*")
        .eq("artist_id", artistId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as FanPointsRow | null;
    },
  });
}

export function useAddFanPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      fan_id: string;
      source: FanPointSource;
      points: number;
      ref_id?: string;
      tip_cents?: number;
    }) => {
      const { error } = await supabase.rpc("add_fan_points", {
        _artist_id: input.artist_id,
        _fan_id: input.fan_id,
        _source: input.source,
        _points: input.points,
        _ref_id: input.ref_id ?? null,
        _tip_cents: input.tip_cents ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["top-fans", vars.artist_id] });
      qc.invalidateQueries({ queryKey: ["my-fan-rank", vars.artist_id] });
    },
  });
}
