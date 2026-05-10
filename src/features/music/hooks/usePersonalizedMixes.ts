import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Track } from '../types';

const sb = supabase as unknown as any;

export interface DailyMix {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  tracks: Track[];
}

/**
 * Builds up to 3 "Daily Mix" buckets from the user's recently-played + liked
 * tracks, grouped by genre, padded with fresh tracks from that genre.
 */
export function useDailyMixes(limitPerMix = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'daily-mixes', user?.id],
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<DailyMix[]> => {
      const [{ data: recent }, { data: liked }] = await Promise.all([
        sb
          .from('music_recently_played')
          .select('track:tracks(*)')
          .eq('user_id', user!.id)
          .order('played_at', { ascending: false })
          .limit(80),
        sb
          .from('track_likes')
          .select('track:tracks(*)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(80),
      ]);

      const seedTracks: Track[] = [
        ...((recent ?? []).map((r: any) => r.track).filter(Boolean) as Track[]),
        ...((liked ?? []).map((r: any) => r.track).filter(Boolean) as Track[]),
      ];
      if (!seedTracks.length) return [];

      // Tally genres
      const genreCounts = new Map<string, number>();
      for (const t of seedTracks) {
        if (!t.genre) continue;
        genreCounts.set(t.genre, (genreCounts.get(t.genre) ?? 0) + 1);
      }
      const topGenres = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g);
      if (!topGenres.length) return [];

      // For each genre, fetch a pool and mix with seeds from that genre
      const mixes = await Promise.all(
        topGenres.map(async (genre, idx): Promise<DailyMix> => {
          const { data: pool } = await sb
            .from('tracks')
            .select('*')
            .eq('is_published', true)
            .eq('genre', genre)
            .order('play_count', { ascending: false })
            .limit(60);

          const seedFromGenre = seedTracks.filter((t) => t.genre === genre);
          const merged: Track[] = [];
          const seen = new Set<string>();
          // interleave: seed, fresh, seed, fresh...
          const fresh = (pool as Track[]) ?? [];
          const len = Math.max(seedFromGenre.length, fresh.length);
          for (let i = 0; i < len && merged.length < limitPerMix; i++) {
            for (const cand of [seedFromGenre[i], fresh[i]]) {
              if (cand && !seen.has(cand.id)) {
                seen.add(cand.id);
                merged.push(cand);
                if (merged.length >= limitPerMix) break;
              }
            }
          }
          return {
            id: `mix-${idx + 1}`,
            title: `Daily Mix ${idx + 1}`,
            subtitle: genre,
            genre,
            tracks: merged,
          };
        }),
      );
      return mixes.filter((m) => m.tracks.length >= 4);
    },
  });
}

/** Picks a recently-played seed and surfaces tracks similar to it. */
export function useBecauseYouListened(limit = 12) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'because-you-listened', user?.id, limit],
    enabled: !!user,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<{ seed: Track; tracks: Track[] } | null> => {
      const { data: recent } = await sb
        .from('music_recently_played')
        .select('track:tracks(*)')
        .eq('user_id', user!.id)
        .order('played_at', { ascending: false })
        .limit(20);
      const candidates: Track[] = ((recent ?? []) as any[])
        .map((r) => r.track as Track | null)
        .filter(Boolean) as Track[];
      const seed = candidates.find((t) => !!t.genre || !!t.creator_id);
      if (!seed) return null;

      // Fetch similar by genre OR same creator, excluding seed and other recents.
      const excludeIds = new Set(candidates.slice(0, 6).map((t) => t.id));
      const orParts: string[] = [];
      if (seed.genre) orParts.push(`genre.eq.${seed.genre}`);
      if (seed.creator_id) orParts.push(`creator_id.eq.${seed.creator_id}`);
      let q = sb
        .from('tracks')
        .select('*')
        .eq('is_published', true)
        .neq('id', seed.id)
        .order('play_count', { ascending: false })
        .limit(limit * 2);
      if (orParts.length) q = q.or(orParts.join(','));
      const { data: pool } = await q;
      const tracks = ((pool as Track[]) ?? [])
        .filter((t) => !excludeIds.has(t.id))
        .slice(0, limit);
      if (!tracks.length) return null;
      return { seed, tracks };
    },
  });
}
