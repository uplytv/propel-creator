import { useEffect } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { muxHlsUrl } from '../lib/musicQueries';

/**
 * Pre-fetches the next track's HLS manifest so the gap between songs is minimal.
 * True gapless requires Web Audio scheduling — this is a pragmatic warm-cache approach.
 */
export function useGaplessPreload() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  useEffect(() => {
    const nextTrack = queue[currentIndex + 1];
    if (!nextTrack?.audio_mux_playback_id) return;
    const url = muxHlsUrl(nextTrack.audio_mux_playback_id);
    // fire-and-forget; lets the browser/CDN cache the manifest
    fetch(url, { method: 'GET', cache: 'force-cache' }).catch(() => {});
  }, [queue, currentIndex]);
}
