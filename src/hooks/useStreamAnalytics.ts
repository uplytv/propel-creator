import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StreamAnalytics {
  peakViewers: number;
  currentViewers: number;
  totalChatMessages: number;
  totalReactions: number;
  totalTips: number;
  tipRevenue: number;
  avgWatchTimeSeconds: number;
  viewerTimeline: { time: string; viewers: number }[];
  chatTimeline: { time: string; messages: number }[];
  engagementRate: number; // percentage of viewers who engaged
}

/**
 * Real-time stream analytics hook.
 * Tracks viewer count, chat rate, tips, and engagement over time during a live stream.
 */
export function useStreamAnalytics(streamId: string | undefined, isLive: boolean) {
  const [analytics, setAnalytics] = useState<StreamAnalytics>({
    peakViewers: 0,
    currentViewers: 0,
    totalChatMessages: 0,
    totalReactions: 0,
    totalTips: 0,
    tipRevenue: 0,
    avgWatchTimeSeconds: 0,
    viewerTimeline: [],
    chatTimeline: [],
    engagementRate: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const chatCountRef = useRef(0);
  const viewerSnapshotsRef = useRef<number[]>([]);

  // Track chat messages in real-time
  const incrementChat = useCallback(() => {
    chatCountRef.current += 1;
    setAnalytics(prev => ({
      ...prev,
      totalChatMessages: prev.totalChatMessages + 1,
    }));
  }, []);

  const recordTip = useCallback((amount: number) => {
    setAnalytics(prev => ({
      ...prev,
      totalTips: prev.totalTips + 1,
      tipRevenue: prev.tipRevenue + amount,
    }));
  }, []);

  const updateViewerCount = useCallback((count: number) => {
    viewerSnapshotsRef.current.push(count);
    setAnalytics(prev => {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      return {
        ...prev,
        currentViewers: count,
        peakViewers: Math.max(prev.peakViewers, count),
        viewerTimeline: [
          ...prev.viewerTimeline.slice(-30),
          { time: timeLabel, viewers: count },
        ],
      };
    });
  }, []);

  // Periodic analytics snapshot
  useEffect(() => {
    if (!isLive || !streamId) return;
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setAnalytics(prev => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const avgViewers = viewerSnapshotsRef.current.length > 0
          ? viewerSnapshotsRef.current.reduce((a, b) => a + b, 0) / viewerSnapshotsRef.current.length
          : 0;
        const engagementRate = avgViewers > 0
          ? Math.min(100, (prev.totalChatMessages / Math.max(1, avgViewers)) * 10)
          : 0;

        return {
          ...prev,
          avgWatchTimeSeconds: Math.round(elapsed),
          chatTimeline: [
            ...prev.chatTimeline.slice(-30),
            { time: timeLabel, messages: chatCountRef.current },
          ],
          engagementRate: Math.round(engagementRate),
        };
      });

      chatCountRef.current = 0; // Reset per-interval counter
    }, 30000); // every 30s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, streamId]);

  // Fetch historical data on mount
  useEffect(() => {
    if (!streamId) return;
    
    const fetchHistory = async () => {
      const [tipsResult, reactionsResult] = await Promise.all([
        supabase
          .from('tip_transactions')
          .select('amount')
          .eq('stream_id', streamId),
        supabase
          .from('live_reactions')
          .select('id', { count: 'exact', head: true })
          .eq('stream_id', streamId),
      ]);

      const tipRevenue = tipsResult.data?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setAnalytics(prev => ({
        ...prev,
        totalTips: tipsResult.data?.length || 0,
        tipRevenue,
        totalReactions: reactionsResult.count || 0,
      }));
    };

    fetchHistory();
  }, [streamId]);

  return {
    analytics,
    incrementChat,
    recordTip,
    updateViewerCount,
  };
}
