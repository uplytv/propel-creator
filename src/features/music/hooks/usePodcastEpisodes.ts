import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface PodcastEpisode {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  episode_number: number | null;
  season_number: number | null;
  cover_image_url: string | null;
  show_name: string | null;
  published_at: string | null;
  is_published: boolean;
  is_explicit: boolean;
  play_count: number;
  created_at: string;
}

export function useArtistPodcastEpisodes(artistId?: string, includeUnpublished = false) {
  return useQuery({
    queryKey: ['music', 'podcast', 'episodes', artistId, includeUnpublished],
    queryFn: async () => {
      if (!artistId) return [];
      let q = supabase
        .from('music_podcast_episodes')
        .select('*')
        .eq('artist_id', artistId)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (!includeUnpublished) q = q.eq('is_published', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as PodcastEpisode[]) ?? [];
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });
}

export function useCreateEpisode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PodcastEpisode>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('music_podcast_episodes')
        .insert({ artist_id: user.id, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data as PodcastEpisode;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'podcast', 'episodes', user?.id] });
    },
  });
}

export function useTogglePublishEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { data, error } = await supabase
        .from('music_podcast_episodes')
        .update({ is_published: publish, published_at: publish ? new Date().toISOString() : null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PodcastEpisode;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'podcast', 'episodes'] }),
  });
}

export function useIncrementEpisodePlay() {
  return useMutation({
    mutationFn: async (episodeId: string) => {
      await supabase.rpc('increment_podcast_episode_plays', { _episode_id: episodeId });
    },
  });
}
