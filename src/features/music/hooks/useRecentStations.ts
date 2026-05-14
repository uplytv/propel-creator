import type { StationSeed } from './useRecs';

const KEY = 'uply:recent-stations:v1';
const MAX = 8;

export interface RecentStation {
  seed: StationSeed;
  startedAt: string;
}

function readRaw(): RecentStation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentStation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentStation(seed: StationSeed) {
  try {
    const list = readRaw();
    const next = [
      { seed, startedAt: new Date().toISOString() },
      ...list.filter(
        (s) => s.seed.seedId !== seed.seedId || s.seed.seedType !== seed.seedType
      ),
    ];
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function clearRecentStations() {
  localStorage.removeItem(KEY);
}

export function useRecentStations() {
  const read = () => readRaw();
  return { list: read(), read, save: saveRecentStation, clear: clearRecentStations };
}
