import { supabase } from '@/integrations/supabase/client';
import type { Track } from '../types';

const sb = supabase as unknown as any;

export type StationSeed = {
  seedType: 'track' | 'artist';
  seedId: string;
  seedName?: string;
};

/**
 * Fetch the current user's exclusion list for a station seed.
 */
async function fetchExclusions(seed: StationSeed): Promise<Set<string>> {
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

async function loadTracks(ids: string[], excluded: Set<string>): Promise<Track[]> {
  const filtered = ids.filter((id) => !excluded.has(id));
  if (!filtered.length) return [];
  const { data } = await sb
    .from('tracks')
    .select('*')
    .in('id', filtered)
    .eq('is_published', true)
    .eq('audio_status', 'ready');
  // preserve input order
  const map = new Map<string, Track>();
  (data || []).forEach((t: Track) => map.set(t.id, t));
  return filtered.map((id) => map.get(id)!).filter(Boolean);
}

/**
 * Recommendations for a station, in priority order:
 *   1. track_co_plays for the seed track (or seed artist's top tracks)
 *   2. user's daily_mixes
 *   3. popular tracks this week (fallback)
 *
 * Filters out anything excluded via thumbs-down and anything in `excludeIds`.
 */
export async function fetchRecs(
  seed: StationSeed,
  opts: { excludeIds?: Set<string>; limit?: number } = {},
): Promise<Track[]> {
  const limit = opts.limit ?? 10;
  const baseExclude = opts.excludeIds ?? new Set<string>();
  const userExclude = await fetchExclusions(seed);
  const exclude = new Set<string>([...baseExclude, ...userExclude]);

  const collected: string[] = [];
  const seen = new Set<string>(exclude);

  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    collected.push(id);
  };

  // 1) co-plays
  if (seed.seedType === 'track') {
    const { data } = await sb
      .from('track_co_plays')
      .select('track_b, co_play_count')
      .eq('track_a', seed.seedId)
      .order('co_play_count', { ascending: false })
      .limit(50);
    (data || []).forEach((r: any) => push(r.track_b));
  } else {
    // artist: top tracks by play_count
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

  // 2) daily mixes
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

  // 3) popular this week
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
  const tracks = await loadTracks(picks, exclude);
  return tracks.slice(0, limit);
}

/**
 * Add a track to the user's station exclusion list (thumbs-down).
 */
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
