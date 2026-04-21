import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Playlist {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  position: number;
  added_at: string;
}

export function useMyPlaylists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-playlists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("creator_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Playlist[];
    },
    enabled: !!user,
  });
}

export function usePlaylist(playlistId?: string) {
  return useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: async () => {
      if (!playlistId) return null;
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", playlistId)
        .maybeSingle();
      if (error) throw error;
      return data as Playlist | null;
    },
    enabled: !!playlistId,
  });
}

export function usePlaylistItems(playlistId?: string) {
  return useQuery({
    queryKey: ["playlist-items", playlistId],
    queryFn: async () => {
      if (!playlistId) return [];
      const { data, error } = await supabase
        .from("playlist_items")
        .select("*, videos:video_id(id, title, slug, thumbnail_url, playback_id, duration_seconds, creator_id, view_count)")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!playlistId,
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; is_public?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("playlists")
        .insert({ creator_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-playlists"] }),
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-playlists"] }),
  });
}

export function useAddVideoToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      // Find max position
      const { data: existing } = await supabase
        .from("playlist_items")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPos = (existing?.position ?? -1) + 1;
      const { error } = await supabase
        .from("playlist_items")
        .insert({ playlist_id: playlistId, video_id: videoId, position: nextPos });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist-items", vars.playlistId] });
      qc.invalidateQueries({ queryKey: ["my-playlists"] });
    },
  });
}

export function useRemoveVideoFromPlaylist(playlistId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("playlist_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
      qc.invalidateQueries({ queryKey: ["my-playlists"] });
    },
  });
}
