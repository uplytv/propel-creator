import { useRef, useCallback, useEffect, useState } from 'react';

export type BitrateLevel = 'high' | 'medium' | 'low';

interface AdaptiveBitrateState {
  currentLevel: BitrateLevel;
  currentBitrateKbps: number;
  isAdapting: boolean;
}

const LEVELS: Record<BitrateLevel, { bitrate: number; width: number; height: number; fps: number }> = {
  high: { bitrate: 2500, width: 1280, height: 720, fps: 30 },
  medium: { bitrate: 1200, width: 854, height: 480, fps: 24 },
  low: { bitrate: 600, width: 640, height: 360, fps: 20 },
};

/**
 * Monitors outbound WebRTC stats and dynamically adjusts encoding parameters
 * to match network conditions — like YouTube/Twitch ABR but for WebRTC.
 */
export function useAdaptiveBitrate(
  peerConnections: React.MutableRefObject<Map<string, RTCPeerConnection>>,
  streamRef: React.MutableRefObject<MediaStream | null>,
  enabled: boolean = true
) {
  const [state, setState] = useState<AdaptiveBitrateState>({
    currentLevel: 'high',
    currentBitrateKbps: 2500,
    isAdapting: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBytesSentRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(0);
  const consecutiveLowRef = useRef<number>(0);
  const consecutiveHighRef = useRef<number>(0);

  const applyBitrate = useCallback(async (level: BitrateLevel) => {
    const config = LEVELS[level];
    
    peerConnections.current.forEach(async (pc) => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (!videoSender) return;

      const params = videoSender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = config.bitrate * 1000;
      params.encodings[0].maxFramerate = config.fps;
      
      try {
        await videoSender.setParameters(params);
      } catch {
        // Some browsers don't support this
      }
    });

    // Also constrain the video track itself for resolution
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({
          width: { ideal: config.width },
          height: { ideal: config.height },
          frameRate: { ideal: config.fps },
        });
      } catch {
        // Constraint not supported
      }
    }

    setState({
      currentLevel: level,
      currentBitrateKbps: config.bitrate,
      isAdapting: true,
    });

    // Reset adapting flag after a moment
    setTimeout(() => setState(s => ({ ...s, isAdapting: false })), 2000);
  }, [peerConnections, streamRef]);

  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(async () => {
      // Sample from the first active peer connection
      const pcs = Array.from(peerConnections.current.values());
      if (pcs.length === 0) return;

      const pc = pcs[0];
      try {
        const stats = await pc.getStats();
        let bytesSent = 0;
        let timestamp = 0;

        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            bytesSent = report.bytesSent || 0;
            timestamp = report.timestamp || Date.now();
          }
        });

        if (prevBytesSentRef.current > 0 && prevTimestampRef.current > 0) {
          const deltaBytes = bytesSent - prevBytesSentRef.current;
          const deltaTime = (timestamp - prevTimestampRef.current) / 1000;
          const actualBitrateKbps = (deltaBytes * 8) / deltaTime / 1000;

          const currentConfig = LEVELS[state.currentLevel];
          const ratio = actualBitrateKbps / currentConfig.bitrate;

          if (ratio < 0.5) {
            // Network can't handle current bitrate
            consecutiveLowRef.current++;
            consecutiveHighRef.current = 0;
            if (consecutiveLowRef.current >= 3) {
              // Downgrade
              const newLevel = state.currentLevel === 'high' ? 'medium' : 'low';
              if (newLevel !== state.currentLevel) applyBitrate(newLevel);
              consecutiveLowRef.current = 0;
            }
          } else if (ratio > 0.85) {
            // Network has headroom
            consecutiveHighRef.current++;
            consecutiveLowRef.current = 0;
            if (consecutiveHighRef.current >= 5) {
              // Upgrade (be more conservative about upgrading)
              const newLevel = state.currentLevel === 'low' ? 'medium' : 'high';
              if (newLevel !== state.currentLevel) applyBitrate(newLevel);
              consecutiveHighRef.current = 0;
            }
          } else {
            consecutiveLowRef.current = 0;
            consecutiveHighRef.current = 0;
          }
        }

        prevBytesSentRef.current = bytesSent;
        prevTimestampRef.current = timestamp;
      } catch {
        // PC closed
      }
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, state.currentLevel, applyBitrate, peerConnections]);

  return state;
}
