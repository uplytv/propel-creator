import { useRef, useCallback } from 'react';

export interface VODChapter {
  timestamp: number; // seconds from start
  title: string;
  type: 'poll' | 'topic_shift' | 'tip_moment' | 'viewer_peak' | 'manual';
}

/**
 * Auto-creates chapter markers from chat topics, polls, and engagement peaks.
 * These can be stored with the recording for VOD navigation.
 */
export function useVODChapters() {
  const chaptersRef = useRef<VODChapter[]>([]);
  const streamStartRef = useRef<number>(Date.now());
  const lastChapterRef = useRef<number>(0);

  const start = useCallback(() => {
    streamStartRef.current = Date.now();
    chaptersRef.current = [{ timestamp: 0, title: 'Stream Start', type: 'manual' }];
    lastChapterRef.current = 0;
  }, []);

  const getElapsed = () => Math.floor((Date.now() - streamStartRef.current) / 1000);

  const addChapter = useCallback((title: string, type: VODChapter['type'] = 'manual') => {
    const elapsed = getElapsed();
    // Minimum 60s between auto-chapters
    if (type !== 'manual' && elapsed - lastChapterRef.current < 60) return;
    
    chaptersRef.current.push({ timestamp: elapsed, title, type });
    lastChapterRef.current = elapsed;
  }, []);

  const addPollChapter = useCallback((question: string) => {
    addChapter(`📊 Poll: ${question}`, 'poll');
  }, [addChapter]);

  const addTipMoment = useCallback((amount: number, senderName: string) => {
    if (amount >= 10) {
      addChapter(`💰 Big tip from ${senderName}`, 'tip_moment');
    }
  }, [addChapter]);

  const addViewerPeak = useCallback((count: number) => {
    addChapter(`👀 Viewer peak: ${count}`, 'viewer_peak');
  }, [addChapter]);

  const getChapters = useCallback((): VODChapter[] => {
    return [...chaptersRef.current].sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  const getChaptersDescription = useCallback((): string => {
    return getChapters()
      .map(c => {
        const m = Math.floor(c.timestamp / 60);
        const s = c.timestamp % 60;
        return `${m}:${s.toString().padStart(2, '0')} - ${c.title}`;
      })
      .join('\n');
  }, [getChapters]);

  return {
    start,
    addChapter,
    addPollChapter,
    addTipMoment,
    addViewerPeak,
    getChapters,
    getChaptersDescription,
    chapters: chaptersRef.current,
  };
}
