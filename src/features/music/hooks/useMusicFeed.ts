import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchForYouTracks,
  fetchPublishedTracks,
  fetchTracksFromCreators,
  fetchTrendingTracks,
} from '../lib/musicQueries';

const sb = supabase as unknown as any;

export function useMusicFeed(userId?: string | null) {
  return useQuery({
    queryKey: ['music', 'feed', userId ?? null],
    queryFn: async () => {
      const [forYou, newReleases, trending] = await Promise.all([
        fetchForYouTracks(userId ?? null),
        fetchPublishedTracks(),
        fetchTrendingTracks(),
      ]);

      let following: any[] = [];
      if (userId) {
        const { data: rows } = await sb
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .limit(200);
        const ids = (rows ?? []).map((r: any) => r.following_id);
        following = await fetchTracksFromCreators(ids);
      }

      return { forYou, newReleases, trending, following };
    },
  });
}
