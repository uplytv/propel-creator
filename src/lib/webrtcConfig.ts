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
 */
export function getRecorderOptions(): { mimeType: string; videoBitsPerSecond: number } {
  const codecs = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];
  const mimeType = codecs.find(c => MediaRecorder.isTypeSupported(c)) || 'video/webm';
  return {
    mimeType,
    // 2.5 Mbps for high-quality recording (balanced file size vs quality)
    videoBitsPerSecond: 2_500_000,
  };
}

/**
 * Optimal camera constraints for live streaming.
 */
export function getCameraConstraints(facingMode: 'user' | 'environment'): MediaStreamConstraints {
  return {
    video: {
      facingMode,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 },
      // Reduce latency on supported browsers
      ...(typeof window !== 'undefined' && { latency: { ideal: 0 } } as any),
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
