import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerStore } from './usePlayerStore';
import type { Track } from '../types';

const sb = supabase as unknown as any;

/**
 * When the queue is about to end, fetch related tracks (same genre or same creator)
 * and append them so playback keeps going — Spotify-style autoplay radio.
 */
export function useAutoplayRadio() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const autoplayRadio = usePlayerStore((s) => s.autoplayRadio);
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
        let related: Track[] = [];

        // 1) try same genre
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

        // 2) fallback: same creator
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

        // shuffle a bit and take 5
        related.sort(() => Math.random() - 0.5);
        const picks = related.slice(0, 5);
        if (picks.length) {
          usePlayerStore.getState().enqueue(picks);
        }
      } finally {
        fetchingRef.current = false;
      }
    })();
  }, [queue, currentIndex, autoplayRadio]);
}
