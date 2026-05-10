import { create } from 'zustand';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

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

  loadTrack: (track: Track, queue?: Track[]) => void;
  enqueue: (tracks: Track[]) => void;
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

  // internal — wired by PersistentPlayer
  _setPosition: (s: number) => void;
  _setDuration: (s: number) => void;
  _setIsPlaying: (b: boolean) => void;
  _seekRequest: number | null;
  _consumeSeek: () => number | null;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  positionSeconds: 0,
  durationSeconds: 0,
  volume: 0.9,
  muted: false,
  repeatMode: 'off',
  shuffle: false,
  _seekRequest: null,

  loadTrack: (track, queue) => {
    if (queue && queue.length) {
      const idx = queue.findIndex((t) => t.id === track.id);
      set({
        queue: queue,
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

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex, repeatMode, shuffle } = get();
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
    const { queue, currentIndex, positionSeconds } = get();
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

  _setPosition: (s) => set({ positionSeconds: s }),
  _setDuration: (s) => set({ durationSeconds: s }),
  _setIsPlaying: (b) => set({ isPlaying: b }),
  _consumeSeek: () => {
    const r = get()._seekRequest;
    if (r !== null) set({ _seekRequest: null });
    return r;
  },
}));

export function currentTrack(): Track | null {
  const { queue, currentIndex } = usePlayerStore.getState();
  if (currentIndex < 0 || currentIndex >= queue.length) return null;
  return queue[currentIndex];
}
