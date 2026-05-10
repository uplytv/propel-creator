import { useEffect, useState, useCallback } from 'react';

export interface PlaybackPrefs {
  crossfadeSec: number; // 0-12
  gapless: boolean;
  eqPreset: EqPreset;
  eqBands: number[]; // 10 bands, dB -12..+12
}

export type EqPreset =
  | 'flat'
  | 'bass-boost'
  | 'vocal'
  | 'rock'
  | 'electronic'
  | 'acoustic'
  | 'podcast'
  | 'custom';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<Exclude<EqPreset, 'custom'>, number[]> = {
  flat:        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'bass-boost':[6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  vocal:       [-2,-1, 0, 2, 4, 4, 3, 1, 0, 0],
  rock:        [4, 3, 2, 0,-1, 1, 3, 4, 4, 3],
  electronic:  [5, 4, 1, 0,-2, 1, 1, 2, 4, 5],
  acoustic:    [3, 2, 1, 1, 2, 2, 3, 4, 3, 2],
  podcast:     [-3,-2,-1, 1, 3, 4, 4, 2, 0,-1],
};

const KEY = 'uply.music.playback.v1';

const DEFAULT: PlaybackPrefs = {
  crossfadeSec: 0,
  gapless: true,
  eqPreset: 'flat',
  eqBands: EQ_PRESETS.flat,
};

function load(): PlaybackPrefs {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function usePlaybackPrefs() {
  const [prefs, setPrefs] = useState<PlaybackPrefs>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
    window.dispatchEvent(new CustomEvent('uply:playback-prefs', { detail: prefs }));
  }, [prefs]);

  const setCrossfade = useCallback((s: number) => setPrefs((p) => ({ ...p, crossfadeSec: Math.max(0, Math.min(12, s)) })), []);
  const setGapless = useCallback((v: boolean) => setPrefs((p) => ({ ...p, gapless: v })), []);
  const setPreset = useCallback((preset: EqPreset) => {
    setPrefs((p) => ({
      ...p,
      eqPreset: preset,
      eqBands: preset === 'custom' ? p.eqBands : EQ_PRESETS[preset],
    }));
  }, []);
  const setBand = useCallback((index: number, dB: number) => {
    setPrefs((p) => {
      const next = [...p.eqBands];
      next[index] = Math.max(-12, Math.min(12, dB));
      return { ...p, eqPreset: 'custom', eqBands: next };
    });
  }, []);
  const resetEq = useCallback(() => setPrefs((p) => ({ ...p, eqPreset: 'flat', eqBands: EQ_PRESETS.flat })), []);

  return { prefs, setCrossfade, setGapless, setPreset, setBand, resetEq };
}
