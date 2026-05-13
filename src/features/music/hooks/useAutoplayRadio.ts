import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerStore } from './usePlayerStore';
import { fetchRecs } from './useRecs';
import { trackEvent } from '@/lib/posthog';
import type { Track } from '../types';

const sb = supabase as unknown as any;

/**
 * When the queue is about to end, append more tracks so playback keeps going.
 * - If a station is active, we feed from the recs pipeline (track_co_plays /
 *   daily_mixes / popular fallback), filtering thumbs-down exclusions.
 * - Otherwise we fall back to "same genre, then same creator" of the seed.
 */
export function useAutoplayRadio() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const autoplayRadio = usePlayerStore((s) => s.autoplayRadio);
  const station = usePlayerStore((s) => s.station);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!autoplayRadio) return;
    if (currentIndex < 0 || queue.length === 0) return;
    const remaining = queue.length - currentIndex - 1;
    if (remaining > 1 || fetchingRef.current) return;

    const seed = queue[currentIndex];
    if (!seed) return;
    fetchingRef.current = true;

    (async () => {
      try {
        const existingIds = new Set(queue.map((t) => t.id));
        let picks: Track[] = [];

        if (station) {
          // Station mode — pull from recs pipeline
          picks = await fetchRecs(station, { excludeIds: existingIds, limit: 5 });
          if (picks.length) {
            usePlayerStore.getState().appendStationRecs(picks);
            trackEvent('autoplay_radio_continued', {
              source: 'station',
              station_seed_type: station.seedType,
              station_seed_id: station.seedId,
              added: picks.length,
            });
            return;
          }
          // fall through to genre/creator fallback if station produced nothing
        }

        let related: Track[] = [];
        if (seed.genre) {
          const { data } = await sb
            .from('tracks')
            .select('*')
            .eq('genre', seed.genre)
            .eq('is_published', true)
            .eq('audio_status', 'ready')
            .neq('id', seed.id)
            .limit(15);
          related = (data || []).filter((t: Track) => !existingIds.has(t.id));
        }
        if (related.length < 5) {
          const { data } = await sb
            .from('tracks')
            .select('*')
            .eq('creator_id', seed.creator_id)
            .eq('is_published', true)
            .eq('audio_status', 'ready')
            .neq('id', seed.id)
            .limit(10);
          for (const t of (data || []) as Track[]) {
            if (!existingIds.has(t.id) && !related.find((r) => r.id === t.id)) {
              related.push(t);
            }
          }
        }
        related.sort(() => Math.random() - 0.5);
        picks = related.slice(0, 5);
        if (picks.length) {
          usePlayerStore.getState().enqueue(picks);
          trackEvent('autoplay_radio_continued', { source: 'genre_creator', added: picks.length });
        }
      } finally {
        fetchingRef.current = false;
      }
    })();
  }, [queue, currentIndex, autoplayRadio, station]);
}
