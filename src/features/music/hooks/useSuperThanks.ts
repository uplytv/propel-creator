import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useArtistRecentTips(artistId?: string, limit = 25) {
  return useQuery({
    queryKey: ['music', 'super-thanks', 'recent', artistId, limit],
    queryFn: async () => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('music_tips')
        .select('id, fan_id, artist_id, track_id, amount_cents, message, created_at')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!artistId,
  });
}

export interface TipperLeaderEntry {
  fan_id: string;
  total_cents: number;
  tip_count: number;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function useTopTippers(artistId?: string, limit = 10) {
  return useQuery({
    queryKey: ['music', 'super-thanks', 'top', artistId, limit],
    queryFn: async (): Promise<TipperLeaderEntry[]> => {
      if (!artistId) return [];
      const { data, error } = await supabase
        .from('music_tips')
        .select('fan_id, amount_cents')
        .eq('artist_id', artistId)
        .limit(1000);
      if (error) throw error;
      const map = new Map<string, { total: number; count: number }>();
      for (const row of data ?? []) {
        const fid = (row as any).fan_id as string;
        const cur = map.get(fid) ?? { total: 0, count: 0 };
        cur.total += (row as any).amount_cents ?? 0;
        cur.count += 1;
        map.set(fid, cur);
      }
      const ranked = Array.from(map.entries())
        .map(([fan_id, v]) => ({ fan_id, total_cents: v.total, tip_count: v.count }))
        .sort((a, b) => b.total_cents - a.total_cents)
        .slice(0, limit);

      if (ranked.length === 0) return ranked;

      const ids = ranked.map((r) => r.fan_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', ids);
      const pmap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return ranked.map((r) => ({
        ...r,
        display_name: pmap.get(r.fan_id)?.display_name ?? null,
        avatar_url: pmap.get(r.fan_id)?.avatar_url ?? null,
      }));
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });
}

export function useArtistTipTotals(artistId?: string) {
  return useQuery({
    queryKey: ['music', 'super-thanks', 'totals', artistId],
    queryFn: async () => {
      if (!artistId) return { total_cents: 0, tip_count: 0, supporter_count: 0 };
      const { data, error } = await supabase
        .from('music_tips')
        .select('fan_id, amount_cents')
        .eq('artist_id', artistId)
        .limit(5000);
      if (error) throw error;
      const supporters = new Set<string>();
      let total = 0;
      for (const row of data ?? []) {
        supporters.add((row as any).fan_id);
        total += (row as any).amount_cents ?? 0;
      }
      return {
        total_cents: total,
        tip_count: (data ?? []).length,
        supporter_count: supporters.size,
      };
    },
    enabled: !!artistId,
  });
}
