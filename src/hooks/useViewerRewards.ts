import { useState, useRef, useCallback, useEffect } from 'react';

export interface ViewerBadge {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
  earnedAt?: number;
}

export interface ViewerRewardState {
  watchTimeSeconds: number;
  chatCount: number;
  tipCount: number;
  xp: number;
  badges: ViewerBadge[];
  newBadge: ViewerBadge | null;
}

const BADGE_DEFS: Omit<ViewerBadge, 'earned' | 'earnedAt'>[] = [
  { id: 'watcher_5', label: '5 Min Watcher', emoji: '👁️' },
  { id: 'watcher_10', label: 'Dedicated Viewer', emoji: '🔥' },
  { id: 'watcher_30', label: 'Marathon Viewer', emoji: '🏆' },
  { id: 'chatter_5', label: 'Active Chatter', emoji: '💬' },
  { id: 'chatter_20', label: 'Chat Star', emoji: '⭐' },
  { id: 'tipper', label: 'Generous Tipper', emoji: '💎' },
  { id: 'early_bird', label: 'Early Bird', emoji: '🐦' },
];

/**
 * Viewer loyalty rewards system.
 * Awards XP and badges based on watch time, chat messages, and tips.
 */
export function useViewerRewards(isActive: boolean) {
  const [state, setState] = useState<ViewerRewardState>({
    watchTimeSeconds: 0,
    chatCount: 0,
    tipCount: 0,
    xp: 0,
    badges: BADGE_DEFS.map(b => ({ ...b, earned: false })),
    newBadge: null,
  });

  const watchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedAtRef = useRef<number>(Date.now());

  // Track watch time
  useEffect(() => {
    if (!isActive) return;
    joinedAtRef.current = Date.now();
    
    // Award early bird if joined in first 60s (approximation)
    const earlyTimeout = setTimeout(() => {
      setState(prev => {
        const badges = [...prev.badges];
        const eb = badges.find(b => b.id === 'early_bird');
        if (eb && !eb.earned) {
          eb.earned = true;
          eb.earnedAt = Date.now();
          return { ...prev, badges, xp: prev.xp + 20, newBadge: eb };
        }
        return prev;
      });
    }, 100);

    watchTimerRef.current = setInterval(() => {
      setState(prev => {
        const newTime = prev.watchTimeSeconds + 1;
        let xpGain = 1; // 1 XP per second
        const badges = [...prev.badges];
        let newBadge: ViewerBadge | null = null;

        // Check time-based badges
        if (newTime >= 300) { // 5 min
          const b = badges.find(b => b.id === 'watcher_5');
          if (b && !b.earned) { b.earned = true; b.earnedAt = Date.now(); xpGain += 50; newBadge = b; }
        }
        if (newTime >= 600) { // 10 min
          const b = badges.find(b => b.id === 'watcher_10');
          if (b && !b.earned) { b.earned = true; b.earnedAt = Date.now(); xpGain += 100; newBadge = b; }
        }
        if (newTime >= 1800) { // 30 min
          const b = badges.find(b => b.id === 'watcher_30');
          if (b && !b.earned) { b.earned = true; b.earnedAt = Date.now(); xpGain += 200; newBadge = b; }
        }

        return {
          ...prev,
          watchTimeSeconds: newTime,
          xp: prev.xp + xpGain,
          badges,
          newBadge: newBadge || (prev.newBadge && Date.now() - (prev.newBadge.earnedAt || 0) < 4000 ? prev.newBadge : null),
        };
      });
    }, 1000);

    return () => {
      clearTimeout(earlyTimeout);
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, [isActive]);

  const recordChat = useCallback(() => {
    setState(prev => {
      const newCount = prev.chatCount + 1;
      let xpGain = 5;
      const badges = [...prev.badges];
      let newBadge: ViewerBadge | null = null;

      if (newCount >= 5) {
        const b = badges.find(b => b.id === 'chatter_5');
        if (b && !b.earned) { b.earned = true; b.earnedAt = Date.now(); xpGain += 50; newBadge = b; }
      }
      if (newCount >= 20) {
        const b = badges.find(b => b.id === 'chatter_20');
        if (b && !b.earned) { b.earned = true; b.earnedAt = Date.now(); xpGain += 100; newBadge = b; }
      }

      return {
        ...prev,
        chatCount: newCount,
        xp: prev.xp + xpGain,
        badges,
        newBadge: newBadge || prev.newBadge,
      };
    });
  }, []);

  const recordTip = useCallback(() => {
    setState(prev => {
      const badges = [...prev.badges];
      let newBadge: ViewerBadge | null = null;
      const b = badges.find(b => b.id === 'tipper');
      if (b && !b.earned) { b.earned = true; b.earnedAt = Date.now(); newBadge = b; }
      return {
        ...prev,
        tipCount: prev.tipCount + 1,
        xp: prev.xp + 50,
        badges,
        newBadge: newBadge || prev.newBadge,
      };
    });
  }, []);

  const dismissBadge = useCallback(() => {
    setState(prev => ({ ...prev, newBadge: null }));
  }, []);

  return { ...state, recordChat, recordTip, dismissBadge };
}
