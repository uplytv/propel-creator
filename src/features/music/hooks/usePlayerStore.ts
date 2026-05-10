import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';
export type EqPreset =
  | 'flat'
  | 'bass-boost'
  | 'treble-boost'
  | 'vocal'
  | 'electronic'
  | 'acoustic'
  | 'rock';

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  volume: number;
  muted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;

  // Polish features
  playbackRate: number;
  eqPreset: EqPreset;
  autoplayRadio: boolean;
  sleepTimerEndsAt: number | null; // epoch ms; null = off
  sleepEndOfTrack: boolean;

  loadTrack: (track: Track, queue?: Track[]) => void;
  enqueue: (tracks: Track[]) => void;
  enqueueNext: (tracks: Track[]) => void;
  playAt: (index: number) => void;
  removeAt: (index: number) => void;
  moveQueueItem: (from: number, to: number) => void;
  clearQueue: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setRepeat: (r: RepeatMode) => void;
  toggleShuffle: () => void;

  setPlaybackRate: (r: number) => void;
  setEqPreset: (p: EqPreset) => void;
  setAutoplayRadio: (b: boolean) => void;
  setSleepTimer: (minutesFromNow: number | null) => void;
  setSleepEndOfTrack: (b: boolean) => void;

  // internal — wired by PersistentPlayer
  _setPosition: (s: number) => void;
  _setDuration: (s: number) => void;
  _setIsPlaying: (b: boolean) => void;
  _seekRequest: number | null;
  _consumeSeek: () => number | null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      positionSeconds: 0,
      durationSeconds: 0,
      volume: 0.9,
      muted: false,
      repeatMode: 'off',
      shuffle: false,
      playbackRate: 1,
      eqPreset: 'flat',
      autoplayRadio: true,
      sleepTimerEndsAt: null,
      sleepEndOfTrack: false,
      _seekRequest: null,

      loadTrack: (track, queue) => {
        if (queue && queue.length) {
          const idx = queue.findIndex((t) => t.id === track.id);
          set({
            queue,
            currentIndex: idx >= 0 ? idx : 0,
            positionSeconds: 0,
            durationSeconds: 0,
            isPlaying: true,
          });
        } else {
          set({
            queue: [track],
            currentIndex: 0,
            positionSeconds: 0,
            durationSeconds: 0,
            isPlaying: true,
          });
        }
      },

      enqueue: (tracks) => set((s) => ({ queue: [...s.queue, ...tracks] })),
      enqueueNext: (tracks) =>
        set((s) => {
          const next = s.queue.slice();
          next.splice(s.currentIndex + 1, 0, ...tracks);
          return { queue: next };
        }),

      playAt: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;
        set({ currentIndex: index, positionSeconds: 0, isPlaying: true, _seekRequest: 0 });
      },

      removeAt: (index) => {
        const { queue, currentIndex } = get();
        if (index < 0 || index >= queue.length) return;
        const next = queue.slice();
        next.splice(index, 1);
        let nextIdx = currentIndex;
        if (index < currentIndex) nextIdx = currentIndex - 1;
        else if (index === currentIndex) nextIdx = Math.min(currentIndex, next.length - 1);
        set({ queue: next, currentIndex: nextIdx });
      },

      moveQueueItem: (from, to) => {
        const { queue, currentIndex } = get();
        if (from === to) return;
        const next = queue.slice();
        const [m] = next.splice(from, 1);
        next.splice(to, 0, m);
        let nextIdx = currentIndex;
        if (from === currentIndex) nextIdx = to;
        else if (from < currentIndex && to >= currentIndex) nextIdx = currentIndex - 1;
        else if (from > currentIndex && to <= currentIndex) nextIdx = currentIndex + 1;
        set({ queue: next, currentIndex: nextIdx });
      },

      clearQueue: () => set({ queue: [], currentIndex: -1, isPlaying: false }),

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

      next: () => {
        const { queue, currentIndex, repeatMode, shuffle, sleepEndOfTrack } = get();
        if (sleepEndOfTrack) {
          set({ isPlaying: false, sleepEndOfTrack: false });
          return;
        }
        if (!queue.length) return;
        if (repeatMode === 'one') {
          set({ _seekRequest: 0, isPlaying: true });
          return;
        }
        let nextIdx: number;
        if (shuffle) {
          nextIdx = Math.floor(Math.random() * queue.length);
        } else {
          nextIdx = currentIndex + 1;
          if (nextIdx >= queue.length) {
            if (repeatMode === 'all') nextIdx = 0;
            else {
              set({ isPlaying: false });
              return;
            }
          }
        }
        set({ currentIndex: nextIdx, positionSeconds: 0, isPlaying: true });
      },

      prev: () => {
        const { currentIndex, positionSeconds } = get();
        if (positionSeconds > 3) {
          set({ _seekRequest: 0 });
          return;
        }
        const i = Math.max(0, currentIndex - 1);
        set({ currentIndex: i, positionSeconds: 0, isPlaying: true });
      },

      seek: (s) => set({ _seekRequest: Math.max(0, s), positionSeconds: Math.max(0, s) }),
      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), muted: false }),
      setMuted: (m) => set({ muted: m }),
      setRepeat: (r) => set({ repeatMode: r }),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

      setPlaybackRate: (r) => set({ playbackRate: Math.max(0.5, Math.min(2, r)) }),
      setEqPreset: (p) => set({ eqPreset: p }),
      setAutoplayRadio: (b) => set({ autoplayRadio: b }),
      setSleepTimer: (minutesFromNow) =>
        set({
          sleepTimerEndsAt: minutesFromNow ? Date.now() + minutesFromNow * 60_000 : null,
          sleepEndOfTrack: false,
        }),
      setSleepEndOfTrack: (b) => set({ sleepEndOfTrack: b, sleepTimerEndsAt: null }),

      _setPosition: (s) => set({ positionSeconds: s }),
      _setDuration: (s) => set({ durationSeconds: s }),
      _setIsPlaying: (b) => set({ isPlaying: b }),
      _consumeSeek: () => {
        const r = get()._seekRequest;
        if (r !== null) set({ _seekRequest: null });
        return r;
      },
    }),
    {
      name: 'uply-music-player',
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        repeatMode: s.repeatMode,
        shuffle: s.shuffle,
        playbackRate: s.playbackRate,
        eqPreset: s.eqPreset,
        autoplayRadio: s.autoplayRadio,
      }),
    }
  )
);

export function currentTrack(): Track | null {
  const { queue, currentIndex } = usePlayerStore.getState();
  if (currentIndex < 0 || currentIndex >= queue.length) return null;
  return queue[currentIndex];
}

export const EQ_PRESETS: Record<EqPreset, { low: number; mid: number; high: number }> = {
  flat:           { low: 0,  mid: 0,  high: 0 },
  'bass-boost':   { low: 8,  mid: 0,  high: 0 },
  'treble-boost': { low: 0,  mid: 0,  high: 8 },
  vocal:          { low: -2, mid: 5,  high: 2 },
  electronic:     { low: 5,  mid: -2, high: 4 },
  acoustic:       { low: 2,  mid: 3,  high: 3 },
  rock:           { low: 4,  mid: 1,  high: 5 },
};
