import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WishlistItem {
  id: string;
  fan_id: string;
  artist_id: string;
  track_id: string;
  note: string | null;
  priority: number;
  created_at: string;
}

export function useMyWishlist() {
  return useQuery({
    queryKey: ["music-my-wishlist"],
    staleTime: 30_000,
    queryFn: async (): Promise<WishlistItem[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("music_track_wishlist")
        .select("*")
        .eq("fan_id", u.user.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WishlistItem[];
    },
  });
}

export interface TrackDemand {
  track_id: string;
  fans: number;
  avg_priority: number;
}

export function useTrackDemand(artistId?: string) {
  return useQuery({
    queryKey: ["music-track-demand", artistId],
    enabled: !!artistId,
    staleTime: 60_000,
    queryFn: async (): Promise<TrackDemand[]> => {
      const { data, error } = await supabase
        .from("music_track_wishlist")
        .select("track_id,priority")
        .eq("artist_id", artistId)
        .limit(2000);
      if (error) throw error;
      const map = new Map<string, { sum: number; count: number }>();
      for (const row of (data ?? []) as Array<{ track_id: string; priority: number }>) {
        const e = map.get(row.track_id) ?? { sum: 0, count: 0 };
        e.sum += row.priority || 0;
        e.count += 1;
        map.set(row.track_id, e);
      }
      return Array.from(map.entries())
        .map(([track_id, v]) => ({
          track_id,
          fans: v.count,
          avg_priority: v.count ? v.sum / v.count : 0,
        }))
        .sort((a, b) => b.fans - a.fans);
    },
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      track_id: string;
      note?: string;
      priority?: number;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_track_wishlist")
        .insert({
          fan_id: u.user.id,
          artist_id: input.artist_id,
          track_id: input.track_id,
          note: input.note ?? null,
          priority: Math.min(5, Math.max(1, input.priority ?? 3)),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as WishlistItem;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-my-wishlist"] });
      qc.invalidateQueries({ queryKey: ["music-track-demand", row.artist_id] });
    },
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("music_track_wishlist")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-my-wishlist"] });
      qc.invalidateQueries({ queryKey: ["music-track-demand"] });
    },
  });
}

export function useUpdateWishlistPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; priority: number }) => {
      const { error } = await supabase
        .from("music_track_wishlist")
        .update({ priority: Math.min(5, Math.max(1, input.priority)) })
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-my-wishlist"] });
    },
  });
}
