import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export function useMusicSearchHistory(limit = 12) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'search-history', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data } = await sb
        .from('music_search_history')
        .select('query, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit * 3);
      const seen = new Set<string>();
      const out: string[] = [];
      for (const r of (data ?? []) as { query: string }[]) {
        if (seen.has(r.query)) continue;
        seen.add(r.query);
        out.push(r.query);
        if (out.length >= limit) break;
      }
      return out;
    },
  });
}

export function useTrendingSearches(limit = 12) {
  return useQuery({
    queryKey: ['music', 'trending-searches', limit],
    queryFn: async (): Promise<{ query: string; hits: number }[]> => {
      const { data } = await sb
        .from('music_trending_searches')
        .select('query, hits')
        .order('hits', { ascending: false })
        .limit(limit);
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}

export function useRecordSearch() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: string) => {
      if (!q || q.trim().length < 2) return;
      await sb.rpc('record_music_search', { _query: q });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'search-history', user?.id] });
      qc.invalidateQueries({ queryKey: ['music', 'trending-searches'] });
    },
  });
}

export function useClearSearchHistory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await sb.from('music_search_history').delete().eq('user_id', user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'search-history', user?.id] }),
  });
}
