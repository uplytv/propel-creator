import { useCallback } from 'react';
import type { StationSeed } from './useRecs';

const KEY = 'uply:recent-stations:v1';
const MAX = 8;

export interface RecentStation {
  seed: StationSeed;
  startedAt: string;
}

export function useRecentStations() {
  const read = useCallback((): RecentStation[] => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecentStation[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const add = useCallback((seed: StationSeed) => {
    try {
      const list = read();
      const next = [{ seed, startedAt: new Date().toISOString() }, ...list.filter((s) => s.seed.seedId !== seed.seedId || s.seed.seedType !== seed.seedType)];
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
    } catch {
      /* ignore */
    }
  }, [read]);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
  }, []);

  return { list: read(), add, clear, read };
}
