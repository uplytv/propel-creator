import { useEffect } from 'react';
import { usePlayerStore } from './usePlayerStore';

/**
 * Global keyboard shortcuts for the player. Disabled while typing in inputs.
 * Space=toggle, J/← seek-10, L/→ seek+10, K=toggle, M=mute, S=shuffle,
 * R=repeat-cycle, ↑/↓ volume.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        t.isContentEditable
      )
        return;

      const s = usePlayerStore.getState();
      if (s.currentIndex < 0) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          s.toggle();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          s.seek(Math.max(0, s.positionSeconds - 10));
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          s.seek(s.positionSeconds + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.setVolume(Math.min(1, s.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.setVolume(Math.max(0, s.volume - 0.05));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          s.setMuted(!s.muted);
          break;
        case 's':
        case 'S':
          e.preventDefault();
          s.toggleShuffle();
          break;
        case 'r':
        case 'R': {
          e.preventDefault();
          const order: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
          const i = order.indexOf(s.repeatMode);
          s.setRepeat(order[(i + 1) % order.length]);
          break;
        }
        case 'n':
        case 'N':
          e.preventDefault();
          s.next();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          s.prev();
          break;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
