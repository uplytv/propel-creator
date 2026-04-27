/**
 * Shared WebRTC configuration for ultra-low-latency streaming.
 * Centralized so both host (BroadcastStudio) and viewer (WebRTCPlayer) use identical settings.
 */

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN — fast, reliable
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN relay for NAT traversal (UDP preferred, TCP fallback)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  // Prefer relay only when direct connection fails
  iceTransportPolicy: 'all',
  // Gather ICE candidates from all available network interfaces
  iceCandidatePoolSize: 4,
  // Use "balanced" bundling for audio+video on one transport
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

/**
 * Preferred video codec ordering for low-latency.
 * H.264 Constrained Baseline has hardware decode on virtually all devices.
 */
export function preferLowLatencyCodecs(pc: RTCPeerConnection) {
  if (!('getTransceivers' in pc)) return;

  pc.getTransceivers().forEach((transceiver) => {
    if (transceiver.receiver.track.kind !== 'video') return;
    if (!transceiver.setCodecPreferences) return;

    const codecs = RTCRtpReceiver.getCapabilities?.('video')?.codecs || [];
    // Prefer H.264 CBP → VP8 → VP9 (H.264 has lowest decode latency on mobile)
    const sorted = [
      ...codecs.filter(c => c.mimeType === 'video/H264'),
      ...codecs.filter(c => c.mimeType === 'video/VP8'),
      ...codecs.filter(c => c.mimeType === 'video/VP9'),
      ...codecs.filter(c => !['video/H264', 'video/VP8', 'video/VP9'].includes(c.mimeType)),
    ];
    try {
      transceiver.setCodecPreferences(sorted);
    } catch {
      // Not supported in all browsers
    }
  });
}

/**
 * Apply bandwidth constraints to an SDP for adaptive quality.
 */
export function constrainBandwidth(sdp: string, maxBitrateKbps: number): string {
  // Add b=AS line after m=video
  return sdp.replace(
    /(m=video.*\r\n)/,
    `$1b=AS:${maxBitrateKbps}\r\n`
  );
}

/**
 * Optimal MediaRecorder settings for browser recording.
 * Landscape uses higher bitrate for full 1080p quality.
 */
export function getRecorderOptions(
  orientation: 'landscape' | 'portrait' = 'landscape'
): { mimeType: string; videoBitsPerSecond: number } {
  const bitrate = orientation === 'landscape' ? 5_000_000 : 2_500_000;
  const codecs = [
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const mimeType = codecs.find(c => MediaRecorder.isTypeSupported(c)) || 'video/webm';
  return { mimeType, videoBitsPerSecond: bitrate };
}

/**
 * Optimal camera constraints for live streaming.
 * Ideal hints only — browser honors when hardware supports it. Never use `exact`.
 */
export function getCameraConstraints(
  facingMode: 'user' | 'environment',
  orientation: 'landscape' | 'portrait' = 'landscape'
): MediaStreamConstraints {
  const isLandscape = orientation === 'landscape';
  return {
    video: {
      facingMode,
      aspectRatio: { ideal: isLandscape ? 16 / 9 : 9 / 16 },
      frameRate: { ideal: 30, max: 30 },
      width: { ideal: isLandscape ? 1920 : 1080 },
      height: { ideal: isLandscape ? 1080 : 1920 },
      ...(typeof window !== 'undefined' && { latency: { ideal: 0 } }),
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
    },
  };
}
