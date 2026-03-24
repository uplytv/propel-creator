import { useRef, useCallback } from 'react';

export interface HighlightMoment {
  timestamp: number; // seconds from stream start
  type: 'chat_spike' | 'tip' | 'viewer_peak' | 'reaction_burst' | 'poll_result';
  score: number; // 0-100 importance
  label: string;
}

/**
 * Tracks engagement peaks during a live stream to auto-generate highlight moments.
 * After stream ends, returns a ranked list of top moments for highlight reel creation.
 */
export function useStreamHighlights() {
  const momentsRef = useRef<HighlightMoment[]>([]);
  const streamStartRef = useRef<number>(Date.now());
  const lastChatSpikeRef = useRef<number>(0);
  const chatWindowRef = useRef<number[]>([]);

  const start = useCallback(() => {
    streamStartRef.current = Date.now();
    momentsRef.current = [];
    chatWindowRef.current = [];
    lastChatSpikeRef.current = 0;
  }, []);

  const getElapsed = () => Math.floor((Date.now() - streamStartRef.current) / 1000);

  const recordChatMessage = useCallback(() => {
    const now = Date.now();
    chatWindowRef.current.push(now);
    // Keep only last 10 seconds
    chatWindowRef.current = chatWindowRef.current.filter(t => now - t < 10000);
    
    const rate = chatWindowRef.current.length;
    const elapsed = getElapsed();
    
    // Spike detection: >8 messages in 10s window, with 30s cooldown
    if (rate >= 8 && elapsed - lastChatSpikeRef.current > 30) {
      lastChatSpikeRef.current = elapsed;
      momentsRef.current.push({
        timestamp: elapsed,
        type: 'chat_spike',
        score: Math.min(100, rate * 8),
        label: `🔥 Chat exploded (${rate} msgs/10s)`,
      });
    }
  }, []);

  const recordTip = useCallback((amount: number) => {
    momentsRef.current.push({
      timestamp: getElapsed(),
      type: 'tip',
      score: Math.min(100, amount * 5),
      label: `💰 Tip: ${amount} credits`,
    });
  }, []);

  const recordViewerPeak = useCallback((count: number) => {
    momentsRef.current.push({
      timestamp: getElapsed(),
      type: 'viewer_peak',
      score: Math.min(100, count * 2),
      label: `👀 Peak: ${count} viewers`,
    });
  }, []);

  const recordReactionBurst = useCallback((count: number) => {
    if (count >= 5) {
      momentsRef.current.push({
        timestamp: getElapsed(),
        type: 'reaction_burst',
        score: Math.min(100, count * 6),
        label: `⚡ Reaction burst (${count})`,
      });
    }
  }, []);

  const getHighlights = useCallback((topN: number = 6): HighlightMoment[] => {
    return [...momentsRef.current]
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }, []);

  const getHighlightTimestamps = useCallback((): number[] => {
    return getHighlights(6).map(m => m.timestamp).sort((a, b) => a - b);
  }, [getHighlights]);

  return {
    start,
    recordChatMessage,
    recordTip,
    recordViewerPeak,
    recordReactionBurst,
    getHighlights,
    getHighlightTimestamps,
    moments: momentsRef.current,
  };
}
