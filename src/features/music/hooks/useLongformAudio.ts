import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LongformKind = 'podcast' | 'mix' | 'set' | 'interview';

export function useLongformFeed(kind?: LongformKind, limit = 30) {
  return useQuery({
    queryKey: ['music', 'longform', 'feed', kind, limit],
    queryFn: async () => {
      let q = supabase
        .from('music_longform')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(limit);
      if (kind) q = q.eq('kind', kind);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useArtistLongform(artistId?: string) {
  return useQuery({
    queryKey: ['music', 'longform', 'artist', artistId],
    queryFn: async () => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('music_longform')
        .select('*')
        .eq('artist_id', artistId)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!artistId,
  });
}

export function useEpisode(episodeId?: string) {
  return useQuery({
    queryKey: ['music', 'longform', 'episode', episodeId],
    queryFn: async () => {
      if (!episodeId) return null;
      const { data, error } = await supabase
        .from('music_longform')
        .select('*')
        .eq('id', episodeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!episodeId,
  });
}

export function useEpisodeChapters(episodeId?: string) {
  return useQuery({
    queryKey: ['music', 'longform', 'chapters', episodeId],
    queryFn: async () => {
      if (!episodeId) return [];
      const { data, error } = await supabase
        .from('music_longform_chapters')
        .select('*')
        .eq('episode_id', episodeId)
        .order('start_seconds', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!episodeId,
  });
}

export function useUpsertEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      artist_id: string;
      title: string;
      description?: string;
      cover_url?: string;
      audio_url: string;
      duration_seconds: number;
      kind: LongformKind;
      episode_number?: number;
      is_published?: boolean;
    }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('music_longform')
          .update(input)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('music_longform')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['music', 'longform'] });
      if (d?.id) qc.invalidateQueries({ queryKey: ['music', 'longform', 'episode', d.id] });
    },
  });
}

export function useAddChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      episode_id: string;
      start_seconds: number;
      title: string;
      artwork_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('music_longform_chapters')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['music', 'longform', 'chapters', vars.episode_id] }),
  });
}

export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('music_longform_chapters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['music', 'longform', 'chapters'] }),
  });
}

// Per-user playback progress
export function useEpisodeProgress(episodeId?: string) {
  return useQuery({
    queryKey: ['music', 'longform', 'progress', episodeId],
    queryFn: async () => {
      if (!episodeId) return null;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) return null;
      const { data, error } = await supabase
        .from('music_longform_progress')
        .select('*')
        .eq('episode_id', episodeId)
        .eq('user_id', u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!episodeId,
  });
}

export function useSaveProgress() {
  return useMutation({
    mutationFn: async (input: {
      episode_id: string;
      position_seconds: number;
      completed?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) return null;
      const { error } = await supabase.from('music_longform_progress').upsert(
        {
          user_id,
          episode_id: input.episode_id,
          position_seconds: input.position_seconds,
          completed: input.completed ?? false,
        },
        { onConflict: 'user_id,episode_id' },
      );
      if (error) throw error;
      return true;
    },
  });
}
