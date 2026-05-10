import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export interface Collaborator {
  user_id: string;
  added_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function usePlaylistCollaborators(playlistId?: string) {
  return useQuery({
    queryKey: ['music', 'playlist', playlistId, 'collaborators'],
    enabled: !!playlistId,
    queryFn: async (): Promise<Collaborator[]> => {
      const { data, error } = await sb
        .from('music_playlist_collaborators')
        .select('user_id, added_at, profile:profiles!music_playlist_collaborators_user_id_fkey(display_name, username, avatar_url)')
        .eq('playlist_id', playlistId);
      if (error) {
        // fallback (no FK alias) — fetch profiles separately.
        const { data: rows } = await sb
          .from('music_playlist_collaborators')
          .select('user_id, added_at')
          .eq('playlist_id', playlistId);
        const ids = (rows ?? []).map((r: any) => r.user_id);
        const { data: profs } = ids.length
          ? await sb
              .from('profiles')
              .select('user_id, display_name, username, avatar_url')
              .in('user_id', ids)
          : { data: [] as any[] };
        const byId = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
        return (rows ?? []).map((r: any) => ({
          user_id: r.user_id,
          added_at: r.added_at,
          display_name: byId.get(r.user_id)?.display_name ?? null,
          username: byId.get(r.user_id)?.username ?? null,
          avatar_url: byId.get(r.user_id)?.avatar_url ?? null,
        }));
      }
      return (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        added_at: r.added_at,
        display_name: r.profile?.display_name ?? null,
        username: r.profile?.username ?? null,
        avatar_url: r.profile?.avatar_url ?? null,
      }));
    },
  });
}

export function useAddCollaborator(playlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      const clean = username.trim().replace(/^@/, '');
      if (!clean) throw new Error('Enter a username');
      const { data: prof, error: pe } = await sb
        .from('profiles')
        .select('user_id')
        .eq('username', clean)
        .maybeSingle();
      if (pe || !prof?.user_id) throw new Error(`No user found for @${clean}`);
      const { error } = await sb
        .from('music_playlist_collaborators')
        .insert({ playlist_id: playlistId, user_id: prof.user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'playlist', playlistId, 'collaborators'] });
    },
  });
}

export function useRemoveCollaborator(playlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await sb
        .from('music_playlist_collaborators')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['music', 'playlist', playlistId, 'collaborators'] }),
  });
}

export function useTogglePlaylistCollaborative(playlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await sb
        .from('music_playlists')
        .update({ is_collaborative: next })
        .eq('id', playlistId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'playlist', playlistId] }),
  });
}

/** True if the current user is the owner OR a collaborator on a collaborative playlist. */
export function useCanEditPlaylist(playlist?: {
  user_id: string;
  is_collaborative?: boolean;
  id: string;
}) {
  const { user } = useAuth();
  const { data: collabs } = usePlaylistCollaborators(playlist?.id);
  if (!user || !playlist) return false;
  if (playlist.user_id === user.id) return true;
  if (!playlist.is_collaborative) return false;
  return !!collabs?.some((c) => c.user_id === user.id);
}
