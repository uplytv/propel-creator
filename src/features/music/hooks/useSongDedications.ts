import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface SongDedication {
  id: string;
  track_id: string;
  artist_id: string;
  fan_id: string;
  dedicated_to: string;
  message: string | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "refunded";
  is_public: boolean;
  display_order: number;
  created_at: string;
}

export function useTrackDedications(trackId?: string) {
  return useQuery({
    queryKey: ["song-dedications", trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_song_dedications")
        .select("*")
        .eq("track_id", trackId!)
        .eq("status", "paid")
        .eq("is_public", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SongDedication[];
    },
    staleTime: 30_000,
  });
}

export function useMyDedications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-song-dedications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_song_dedications")
        .select("*")
        .eq("fan_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SongDedication[];
    },
  });
}

export function useCreateDedication() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      track_id: string;
      artist_id: string;
      dedicated_to: string;
      message?: string;
      amount_cents: number;
      currency?: string;
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_song_dedications")
        .insert({
          track_id: input.track_id,
          artist_id: input.artist_id,
          fan_id: user.id,
          dedicated_to: input.dedicated_to,
          message: input.message ?? null,
          amount_cents: input.amount_cents,
          currency: input.currency ?? "USD",
          is_public: input.is_public ?? true,
          status: "paid",
        })
        .select()
        .single();
      if (error) throw error;
      return data as SongDedication;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["song-dedications", vars.track_id] });
      qc.invalidateQueries({ queryKey: ["my-song-dedications"] });
    },
  });
}
