import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export type ContextType = 'time_of_day' | 'weather' | 'activity';

export interface ContextPlaylist {
  id: string;
  user_id: string;
  title: string;
  context_type: ContextType;
  context_params: Record<string, any>;
  seed_genres: string[];
  seed_moods: string[];
  cover_url: string | null;
  created_at: string;
}

export function useContextPlaylists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'context-playlists', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ContextPlaylist[]> => {
      const { data, error } = await sb
        .from('music_context_playlists')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContextPlaylist[];
    },
  });
}

export function useSaveContextPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ContextPlaylist, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('not authed');
      const { data, error } = await sb
        .from('music_context_playlists')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as ContextPlaylist;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'context-playlists', user?.id] }),
  });
}

export function useDeleteContextPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('music_context_playlists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'context-playlists', user?.id] }),
  });
}
