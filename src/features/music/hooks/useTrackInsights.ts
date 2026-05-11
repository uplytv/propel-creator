import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export function useTrackInsights(trackId: string | undefined) {
  return useQuery({
    queryKey: ['music', 'track-insights', trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data: plays } = await sb
        .from('track_plays')
        .select('played_at,country,completion_pct')
        .eq('track_id', trackId)
        .gte('played_at', since)
        .limit(5000);

      const playsByDay: Record<string, number> = {};
      const countries: Record<string, number> = {};
      let completionTotal = 0;
      let completionCount = 0;
      for (const p of plays ?? []) {
        const day = (p.played_at as string).slice(0, 10);
        playsByDay[day] = (playsByDay[day] ?? 0) + 1;
        if (p.country) countries[p.country] = (countries[p.country] ?? 0) + 1;
        if (typeof p.completion_pct === 'number') {
          completionTotal += p.completion_pct;
          completionCount++;
        }
      }
      const playsSeries = Object.entries(playsByDay)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, count]) => ({ date, count }));
      const topCountries = Object.entries(countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }));
      const completionRate = completionCount ? completionTotal / completionCount : 0;

      const { data: track } = await sb
        .from('tracks')
        .select('like_count,repost_count,comment_count,play_count')
        .eq('id', trackId)
        .maybeSingle();

      return {
        playsSeries,
        topCountries,
        completionRate,
        likeCount: track?.like_count ?? 0,
        repostCount: track?.repost_count ?? 0,
        commentCount: track?.comment_count ?? 0,
        playCount: track?.play_count ?? 0,
      };
    },
  });
}
