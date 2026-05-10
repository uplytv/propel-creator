import { useEffect, useState } from 'react';
import { usePlayerStore } from './usePlayerStore';

/**
 * Watches the sleep timer and pauses playback when it fires.
 * Returns the formatted "minutes left" string or null when off.
 */
export function useSleepTimer() {
  const endsAt = usePlayerStore((s) => s.sleepTimerEndsAt);
  const [, force] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const now = Date.now();
      if (now >= endsAt) {
        usePlayerStore.getState().pause();
        usePlayerStore.getState().setSleepTimer(null);
      } else {
        force((n) => n + 1);
      }
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const msLeft = Math.max(0, endsAt - Date.now());
  const m = Math.floor(msLeft / 60000);
  const s = Math.floor((msLeft % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
