import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewerDataPoint {
  timestamp: number; // seconds from stream start
  viewerCount: number;
  chatRate: number; // messages per minute
  engagementScore: number;
}

export interface ViewerHeatmapData {
  dataPoints: ViewerDataPoint[];
  peakViewerTime: number;
  peakViewerCount: number;
  avgWatchDuration: number;
  dropoffPoints: Array<{ timestamp: number; dropPercent: number }>;
  retentionCurve: number[]; // 0-100 at each 10% interval
}

export function useViewerHeatmap(streamId: string) {
  const [data, setData] = useState<ViewerHeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const dataPointsRef = useRef<ViewerDataPoint[]>([]);
  const streamStartRef = useRef<number>(Date.now());

  const startTracking = useCallback(() => {
    streamStartRef.current = Date.now();
    dataPointsRef.current = [];
  }, []);

  const recordDataPoint = useCallback((viewerCount: number, chatRate: number) => {
    const elapsed = Math.floor((Date.now() - streamStartRef.current) / 1000);
    const engagementScore = Math.min(100, (chatRate * 10) + (viewerCount * 2));

    dataPointsRef.current.push({
      timestamp: elapsed,
      viewerCount,
      chatRate,
      engagementScore,
    });
  }, []);

  const generateHeatmap = useCallback((): ViewerHeatmapData => {
    const points = dataPointsRef.current;
    if (!points.length) {
      return {
        dataPoints: [],
        peakViewerTime: 0,
        peakViewerCount: 0,
        avgWatchDuration: 0,
        dropoffPoints: [],
        retentionCurve: Array(10).fill(100),
      };
    }

    // Find peak
    let peakIdx = 0;
    points.forEach((p, i) => {
      if (p.viewerCount > points[peakIdx].viewerCount) peakIdx = i;
    });

    // Calculate dropoff points (>20% viewer loss in 60s window)
    const dropoffs: Array<{ timestamp: number; dropPercent: number }> = [];
    for (let i = 1; i < points.length; i++) {
      if (points[i - 1].viewerCount > 0) {
        const dropPct = ((points[i - 1].viewerCount - points[i].viewerCount) / points[i - 1].viewerCount) * 100;
        if (dropPct > 20) {
          dropoffs.push({ timestamp: points[i].timestamp, dropPercent: Math.round(dropPct) });
        }
      }
    }

    // Generate retention curve (10 intervals)
    const maxViewers = points[peakIdx].viewerCount || 1;
    const retentionCurve: number[] = [];
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor((i / 10) * points.length);
      const viewerPct = Math.round((points[idx].viewerCount / maxViewers) * 100);
      retentionCurve.push(viewerPct);
    }

    // Avg watch duration estimate
    const totalViewerSeconds = points.reduce((sum, p) => sum + p.viewerCount, 0) * 30; // assuming 30s intervals
    const avgDuration = maxViewers > 0 ? Math.round(totalViewerSeconds / maxViewers) : 0;

    const heatmap: ViewerHeatmapData = {
      dataPoints: points,
      peakViewerTime: points[peakIdx].timestamp,
      peakViewerCount: points[peakIdx].viewerCount,
      avgWatchDuration: avgDuration,
      dropoffPoints: dropoffs,
      retentionCurve,
    };

    setData(heatmap);
    return heatmap;
  }, []);

  return { data, loading, startTracking, recordDataPoint, generateHeatmap };
}
