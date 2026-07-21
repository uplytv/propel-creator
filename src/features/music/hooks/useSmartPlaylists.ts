import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Track } from "../types";

export type SmartRuleType = "liked" | "recently_played" | "top_played" | "genre" | "artist";

export interface SmartPlaylist {
  id: string;
  user_id: string;
  title: string;
  rule_type: SmartRuleType;
  rule_params: Record<string, any>;
  cover_art_url: string | null;
  folder_id: string | null;
  created_at: string;
}

export function useSmartPlaylists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["smart-playlists", user?.id],
    queryFn: async () => {
      if (!user) return [] as SmartPlaylist[];
      const { data } = await supabase
        .from("music_smart_playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data as SmartPlaylist[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useCreateSmartPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; rule_type: SmartRuleType; rule_params?: Record<string, any> }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_smart_playlists")
        .insert({ user_id: user.id, rule_params: {}, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-playlists", user?.id] }),
  });
}

export function useDeleteSmartPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("music_smart_playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-playlists", user?.id] }),
  });
}

export function useSmartPlaylistTracks(smartId?: string) {
  return useQuery({
    queryKey: ["smart-playlist-tracks", smartId],
    queryFn: async () => {
      if (!smartId) return [] as Track[];
      const { data: ids, error } = await supabase.rpc("resolve_smart_playlist", {
        _smart_id: smartId,
        _limit: 100,
      });
      if (error) throw error;
      const trackIds = ((ids as unknown as { resolve_smart_playlist: string }[] | string[]) ?? []).map((r: any) =>
        typeof r === "string" ? r : r.resolve_smart_playlist ?? r,
      );
      if (!trackIds.length) return [] as Track[];
      const { data: tracks } = await supabase
        .from("tracks")
        .select("*")
        .in("id", trackIds);
      const order = new Map(trackIds.map((id: string, i: number) => [id, i]));
      return ((tracks as Track[]) ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    },
    enabled: !!smartId,
  });
}
