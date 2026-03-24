import { useState, useEffect, useRef, useCallback } from 'react';

export interface BroadcasterHealth {
  uploadSpeedMbps: number;
  droppedFrames: number;
  totalFrames: number;
  dropRate: number; // 0-1
  bitrateKbps: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  cpuPressure: 'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';
}

/**
 * Monitors the broadcaster's outgoing stream health:
 * - Upload speed (actual throughput)
 * - Dropped frames from MediaRecorder/canvas
 * - CPU pressure (if Compute Pressure API is available)
 */
export function useBroadcasterHealth(
  peerConnections: React.MutableRefObject<Map<string, RTCPeerConnection>>,
  isRecording: boolean
): BroadcasterHealth {
  const [health, setHealth] = useState<BroadcasterHealth>({
    uploadSpeedMbps: 0,
    droppedFrames: 0,
    totalFrames: 0,
    dropRate: 0,
    bitrateKbps: 0,
    quality: 'good',
    cpuPressure: 'unknown',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRef = useRef<{ bytes: number; timestamp: number }>({ bytes: 0, timestamp: 0 });
  const pressureObserverRef = useRef<any>(null);

  // Compute Pressure API (Chrome 115+)
  useEffect(() => {
    if (!isRecording) return;
    
    try {
      if ('PressureObserver' in window) {
        const observer = new (window as any).PressureObserver(
          (records: any[]) => {
            const latest = records[records.length - 1];
            if (latest) {
              setHealth(h => ({ ...h, cpuPressure: latest.state }));
            }
          },
          { sampleInterval: 2000 }
        );
        observer.observe('cpu').catch(() => {});
        pressureObserverRef.current = observer;
        return () => observer.disconnect();
      }
    } catch {
      // Not supported
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(async () => {
      const pcs = Array.from(peerConnections.current.values());
      if (pcs.length === 0) return;

      let totalBytesSent = 0;
      let droppedFrames = 0;
      let totalFrames = 0;
      let bitrateKbps = 0;

      for (const pc of pcs) {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              totalBytesSent += report.bytesSent || 0;
              droppedFrames += report.framesDropped || 0;
              totalFrames += report.framesSent || 0;
            }
          });
        } catch { /* pc closed */ }
      }

      const now = Date.now();
      if (prevRef.current.timestamp > 0) {
        const deltaBytes = totalBytesSent - prevRef.current.bytes;
        const deltaTime = (now - prevRef.current.timestamp) / 1000;
        const speedMbps = (deltaBytes * 8) / deltaTime / 1_000_000;
        bitrateKbps = Math.round((deltaBytes * 8) / deltaTime / 1000);

        const dropRate = totalFrames > 0 ? droppedFrames / totalFrames : 0;
        
        let quality: BroadcasterHealth['quality'] = 'excellent';
        if (dropRate > 0.1 || speedMbps < 0.5) quality = 'poor';
        else if (dropRate > 0.05 || speedMbps < 1) quality = 'fair';
        else if (dropRate > 0.02 || speedMbps < 2) quality = 'good';

        setHealth(h => ({
          ...h,
          uploadSpeedMbps: Math.round(speedMbps * 100) / 100,
          droppedFrames,
          totalFrames,
          dropRate,
          bitrateKbps,
          quality,
        }));
      }

      prevRef.current = { bytes: totalBytesSent, timestamp: now };
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, peerConnections]);

  return health;
}
