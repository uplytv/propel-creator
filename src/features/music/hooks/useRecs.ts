/**
 * Tier 2 recommendation hooks. All call SECURITY DEFINER RPCs from the
 * recs migration. Each hook degrades gracefully (returns []) on error
 * so the home page never throws.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Track } from '../types';

const sb = supabase as unknown as any;

async function rpc<T = any>(fn: string, args: Record<string, any>): Promise<T[]> {
  try {
    const { data, error } = await sb.rpc(fn, args);
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

export function useTrending(limit = 20) {
  return useQuery<Track[]>({
    queryKey: ['recs', 'trending', limit],
    queryFn: () => rpc<Track>('recs_trending', { p_limit: limit }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewReleases(limit = 20) {
  return useQuery<Track[]>({
    queryKey: ['recs', 'new-releases', limit],
    queryFn: () => rpc<Track>('recs_new_releases', { p_limit: limit }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useForYou(limit = 20) {
  const { user } = useAuth();
  return useQuery<Track[]>({
    queryKey: ['recs', 'for-you', user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const out = await rpc<Track>('recs_for_you', { p_user: user.id, p_limit: limit });
      // Fall back to fresh new releases if the user has no taste profile yet.
      if (out.length > 0) return out;
      return rpc<Track>('recs_new_releases', { p_limit: limit });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBecauseYouListenedRpc(seedTrackId: string | null | undefined, limit = 10) {
  return useQuery<Track[]>({
    queryKey: ['recs', 'because', seedTrackId, limit],
    enabled: !!seedTrackId,
    queryFn: () => rpc<Track>('recs_because_you_listened', { p_seed: seedTrackId, p_limit: limit }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Embedding-similar with co-play fallback.
 */
export function useSimilarTracks(trackId: string | null | undefined, limit = 10) {
  return useQuery<Track[]>({
    queryKey: ['recs', 'similar', trackId, limit],
    enabled: !!trackId,
    queryFn: async () => {
      if (!trackId) return [];
      const byEmbedding = await rpc<Track>('recs_similar_by_embedding', {
        p_track: trackId,
        p_limit: limit,
      });
      if (byEmbedding.length > 0) return byEmbedding;
      return rpc<Track>('recs_because_you_listened', { p_seed: trackId, p_limit: limit });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface DailyMixRow {
  id: string;
  slot: number;
  title: string;
  description: string | null;
  seed_genres: string[];
  track_ids: string[];
  refreshed_at: string;
}

/**
 * Reads the cron-populated `daily_mixes` table for the current user, then
 * hydrates each mix's track IDs into full Track objects in a single query.
 */
export function useDailyMixesFromTable() {
  const { user } = useAuth();
  return useQuery<{ mix: DailyMixRow; tracks: Track[] }[]>({
    queryKey: ['recs', 'daily-mixes-table', user?.id],
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!user) return [];
      const { data: mixes } = await sb
        .from('daily_mixes')
        .select('*')
        .eq('user_id', user.id)
        .order('slot', { ascending: true });
      const rows = (mixes ?? []) as DailyMixRow[];
      if (rows.length === 0) return [];
      const allIds = Array.from(new Set(rows.flatMap((m) => m.track_ids)));
      const { data: tracks } = await sb.from('tracks').select('*').in('id', allIds);
      const trackMap = new Map<string, Track>();
      for (const t of (tracks ?? []) as Track[]) trackMap.set(t.id, t);
      return rows.map((mix) => ({
        mix,
        tracks: mix.track_ids.map((id) => trackMap.get(id)).filter(Boolean) as Track[],
      }));
    },
  });
}
