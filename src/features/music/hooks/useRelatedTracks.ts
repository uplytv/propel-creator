import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Track } from '../types';

const sb = supabase as unknown as any;

export function useRelatedTracks(track?: Track | null) {
  return useQuery({
    queryKey: ['music', 'related', track?.id, track?.creator_id, track?.genre],
    enabled: !!track,
    queryFn: async () => {
      if (!track) return [] as Track[];
      const [byCreator, byGenre] = await Promise.all([
        sb
          .from('tracks')
          .select('*')
          .eq('creator_id', track.creator_id)
          .eq('is_published', true)
          .eq('audio_status', 'ready')
          .neq('id', track.id)
          .order('play_count', { ascending: false })
          .limit(3),
        track.genre
          ? sb
              .from('tracks')
              .select('*')
              .eq('genre', track.genre)
              .eq('is_published', true)
              .eq('audio_status', 'ready')
              .neq('id', track.id)
              .neq('creator_id', track.creator_id)
              .order('play_count', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] }),
      ]);
      const seen = new Set<string>();
      const out: Track[] = [];
      for (const t of [...(byCreator.data ?? []), ...(byGenre.data ?? [])]) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          out.push(t as Track);
        }
      }
      return out.slice(0, 6);
    },
  });
}
