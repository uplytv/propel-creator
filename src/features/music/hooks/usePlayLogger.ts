import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerStore } from './usePlayerStore';

/**
 * Reports plays >= 30s to music-play-log.
 * Reports once per (track, session-of-play) — when track changes or pauses past 30s.
 */
export function usePlayLogger() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const positionSeconds = usePlayerStore((s) => s.positionSeconds);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const reportedRef = useRef<Set<string>>(new Set());
  const lastTrackId = useRef<string | null>(null);

  const current = queue[currentIndex] ?? null;

  useEffect(() => {
    if (current?.id !== lastTrackId.current) {
      lastTrackId.current = current?.id ?? null;
    }
  }, [current?.id]);

  useEffect(() => {
    if (!current) return;
    const key = current.id;
    if (positionSeconds >= 30 && !reportedRef.current.has(key)) {
      reportedRef.current.add(key);
      supabase.functions
        .invoke('music-play-log', {
          body: { trackId: current.id, durationPlayedSeconds: Math.floor(positionSeconds) },
        })
        .catch(() => {});
    }
  }, [positionSeconds, current?.id, current, isPlaying]);
}
