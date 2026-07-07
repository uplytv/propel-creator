import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface PlaylistCollaborator {
  playlist_id: string;
  user_id: string;
  role: "editor" | "viewer";
  invited_by: string | null;
  added_at: string;
}

export interface PlaylistInvite {
  id: string;
  playlist_id: string;
  token: string;
  role: "editor" | "viewer";
  created_by: string;
  expires_at: string | null;
  consumed_by: string | null;
  consumed_at: string | null;
  created_at: string;
}

export function usePlaylistCollaborators(playlistId?: string) {
  return useQuery({
    queryKey: ["playlist-collaborators", playlistId],
    queryFn: async () => {
      if (!playlistId) return [] as PlaylistCollaborator[];
      const { data } = await supabase
        .from("music_playlist_collaborators")
        .select("*")
        .eq("playlist_id", playlistId);
      return (data as PlaylistCollaborator[]) ?? [];
    },
    enabled: !!playlistId,
  });
}

export function usePlaylistInvites(playlistId?: string) {
  return useQuery({
    queryKey: ["playlist-invites", playlistId],
    queryFn: async () => {
      if (!playlistId) return [] as PlaylistInvite[];
      const { data } = await supabase
        .from("music_playlist_invites")
        .select("*")
        .eq("playlist_id", playlistId)
        .is("consumed_at", null)
        .order("created_at", { ascending: false });
      return (data as PlaylistInvite[]) ?? [];
    },
    enabled: !!playlistId,
  });
}

export function useCreatePlaylistInvite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playlistId,
      role = "editor",
      ttlHours = 168,
    }: {
      playlistId: string;
      role?: "editor" | "viewer";
      ttlHours?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const token = crypto.randomUUID().replace(/-/g, "");
      const expires_at = new Date(Date.now() + ttlHours * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("music_playlist_invites")
        .insert({
          playlist_id: playlistId,
          token,
          role,
          created_by: user.id,
          expires_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PlaylistInvite;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["playlist-invites", vars.playlistId] }),
  });
}

export function useAcceptPlaylistInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_playlist_invite", { _token: token });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlist-collaborators"] }),
  });
}

export function useRemoveCollaborator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, userId }: { playlistId: string; userId: string }) => {
      const { error } = await supabase
        .from("music_playlist_collaborators")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["playlist-collaborators", vars.playlistId] }),
  });
}
