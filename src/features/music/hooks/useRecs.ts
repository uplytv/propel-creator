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

// ============================================================================
// Algorithmic Radio — Station seeds, fetcher, and exclusions
// ============================================================================

export type StationSeed = {
  seedType: 'track' | 'artist';
  seedId: string;
  seedName?: string;
};

async function fetchStationExclusions(seed: StationSeed): Promise<Set<string>> {
  const { data: auth } = await sb.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return new Set();
  const { data } = await sb
    .from('radio_station_exclusions')
    .select('excluded_track_id')
    .eq('user_id', userId)
    .eq('seed_type', seed.seedType)
    .eq('seed_id', seed.seedId);
  return new Set((data || []).map((r: any) => r.excluded_track_id));
}

async function loadTracksByIds(ids: string[], excluded: Set<string>): Promise<Track[]> {
  const filtered = ids.filter((id) => !excluded.has(id));
  if (!filtered.length) return [];
  const { data } = await sb
    .from('tracks')
    .select('*')
    .in('id', filtered)
    .eq('is_published', true)
    .eq('audio_status', 'ready');
  const map = new Map<string, Track>();
  (data || []).forEach((t: Track) => map.set(t.id, t));
  return filtered.map((id) => map.get(id)!).filter(Boolean);
}

/**
 * Fetch radio station recommendations:
 *   1. track_co_plays for the seed track, or top tracks for an artist seed
 *   2. user's daily_mixes
 *   3. popular tracks (fallback)
 * Filters thumbs-down exclusions and tracks already in the queue.
 */
export async function fetchRecs(
  seed: StationSeed,
  opts: { excludeIds?: Set<string>; limit?: number } = {},
): Promise<Track[]> {
  const limit = opts.limit ?? 10;
  const baseExclude = opts.excludeIds ?? new Set<string>();
  const userExclude = await fetchStationExclusions(seed);
  const exclude = new Set<string>([...baseExclude, ...userExclude]);

  const collected: string[] = [];
  const seen = new Set<string>(exclude);
  if (seed.seedType === 'track') seen.add(seed.seedId);

  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    collected.push(id);
  };

  if (seed.seedType === 'track') {
    const { data } = await sb
      .from('track_co_plays')
      .select('track_b, co_play_count')
      .eq('track_a', seed.seedId)
      .order('co_play_count', { ascending: false })
      .limit(50);
    (data || []).forEach((r: any) => push(r.track_b));
  } else {
    const { data } = await sb
      .from('tracks')
      .select('id')
      .eq('creator_id', seed.seedId)
      .eq('is_published', true)
      .eq('audio_status', 'ready')
      .order('play_count', { ascending: false })
      .limit(30);
    (data || []).forEach((r: any) => push(r.id));
  }

  if (collected.length < limit) {
    const { data: auth } = await sb.auth.getUser();
    const userId = auth?.user?.id;
    if (userId) {
      const { data } = await sb
        .from('daily_mixes')
        .select('track_ids')
        .eq('user_id', userId)
        .order('refreshed_at', { ascending: false })
        .limit(3);
      (data || []).forEach((m: any) => (m.track_ids || []).forEach(push));
    }
  }

  if (collected.length < limit) {
    const { data } = await sb
      .from('tracks')
      .select('id')
      .eq('is_published', true)
      .eq('audio_status', 'ready')
      .order('play_count', { ascending: false })
      .limit(50);
    (data || []).forEach((r: any) => push(r.id));
  }

  const picks = collected.slice(0, limit * 2);
  const tracks = await loadTracksByIds(picks, exclude);
  return tracks.slice(0, limit);
}

/** Add a track to the user's station exclusion list (thumbs-down). */
export async function excludeTrackFromStation(seed: StationSeed, trackId: string) {
  const { data: auth } = await sb.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return;
  await sb.from('radio_station_exclusions').insert({
    user_id: userId,
    seed_type: seed.seedType,
    seed_id: seed.seedId,
    excluded_track_id: trackId,
  });
}
