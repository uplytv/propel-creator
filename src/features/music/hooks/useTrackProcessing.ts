import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Track } from '../types';

/**
 * Polls music-track-check until the track is ready (or errored).
 * Mirrors the existing mux-check-upload pattern from the video pipeline.
 * Backoff: 2s, 3s, 5s, then 8s up to ~3 min.
 */
export function useTrackProcessing(track: Track | null | undefined) {
  const qc = useQueryClient();
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    if (!track) return;
    if (track.audio_status === 'ready' || track.audio_status === 'errored') return;

    const delays = [2000, 3000, 5000, 8000, 8000, 10000, 15000, 20000, 30000, 30000];
    let i = 0;
    let timer: number | undefined;

    const run = async () => {
      if (stopped.current) return;
      try {
        const { data } = await supabase.functions.invoke('music-track-check', {
          body: { trackId: track.id },
        });
        const status = (data as any)?.status;
        if (status === 'ready' || status === 'errored') {
          qc.invalidateQueries({ queryKey: ['music', 'track', track.id] });
          return;
        }
      } catch {
        /* swallow — retry */
      }
      if (i < delays.length) {
        timer = window.setTimeout(run, delays[i++]);
      }
    };

    timer = window.setTimeout(run, delays[i++]);
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [track?.id, track?.audio_status, qc]);
}
