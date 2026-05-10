import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export interface KaraokeScore {
  id: string;
  track_id: string;
  user_id: string;
  score: number;
  lines_hit: number;
  total_lines: number;
  created_at: string;
}

export function useKaraokeLeaderboard(trackId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['music', 'karaoke', 'leaderboard', trackId, limit],
    enabled: !!trackId,
    queryFn: async (): Promise<KaraokeScore[]> => {
      const { data, error } = await sb
        .from('karaoke_scores')
        .select('*')
        .eq('track_id', trackId!)
        .order('score', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as KaraokeScore[];
    },
  });
}

export function useSubmitKaraokeScore(trackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { score: number; lines_hit: number; total_lines: number }) => {
      const { data: u } = await sb.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error('Not signed in');
      const { error } = await sb.from('karaoke_scores').insert({
        track_id: trackId,
        user_id: uid,
        score: Math.max(0, Math.min(100, Math.round(input.score))),
        lines_hit: input.lines_hit,
        total_lines: input.total_lines,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'karaoke', 'leaderboard', trackId] }),
  });
}
