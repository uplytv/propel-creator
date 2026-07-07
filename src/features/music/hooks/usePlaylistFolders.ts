import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface PlaylistFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
}

export function usePlaylistFolders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["playlist-folders", user?.id],
    queryFn: async () => {
      if (!user) return [] as PlaylistFolder[];
      const { data } = await supabase
        .from("music_playlist_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      return (data as PlaylistFolder[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useCreateFolder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_playlist_folders")
        .insert({ user_id: user.id, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlist-folders", user?.id] }),
  });
}

export function useDeleteFolder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("music_playlist_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlist-folders", user?.id] });
      qc.invalidateQueries({ queryKey: ["music", "playlists", user?.id] });
    },
  });
}

export function useAssignPlaylistFolder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ playlistId, folderId }: { playlistId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from("music_playlists")
        .update({ folder_id: folderId })
        .eq("id", playlistId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["music", "playlists", user?.id] }),
  });
}
