import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export function useTrackInsights(trackId: string | undefined) {
  return useQuery({
    queryKey: ['music', 'track-insights', trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [{ data: plays }, { data: track }] = await Promise.all([
        sb
          .from('track_plays')
          .select('played_at,duration_played_seconds')
          .eq('track_id', trackId)
          .gte('played_at', since)
          .limit(5000),
        sb
          .from('tracks')
          .select('like_count,repost_count,comment_count,play_count,duration_seconds')
          .eq('id', trackId)
          .maybeSingle(),
      ]);

      const trackDur = Number(track?.duration_seconds ?? 0);
      const playsByDay: Record<string, number> = {};
      let completionTotal = 0;
      let completionCount = 0;
      for (const p of plays ?? []) {
        const day = (p.played_at as string).slice(0, 10);
        playsByDay[day] = (playsByDay[day] ?? 0) + 1;
        if (trackDur > 0 && typeof p.duration_played_seconds === 'number') {
          completionTotal += Math.min(1, p.duration_played_seconds / trackDur);
          completionCount++;
        }
      }
      const playsSeries = Object.entries(playsByDay)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, count]) => ({ date, count }));
      const completionRate = completionCount ? completionTotal / completionCount : 0;

      return {
        playsSeries,
        completionRate,
        likeCount: track?.like_count ?? 0,
        repostCount: track?.repost_count ?? 0,
        commentCount: track?.comment_count ?? 0,
        playCount: track?.play_count ?? 0,
      };
    },
  });
}
