/**
 * Simulcast encoding helper.
 * Configures RTCRtpSender to send multiple quality layers (high/mid/low)
 * so each viewer receives the best quality their connection supports.
 */

export interface SimulcastLayer {
  rid: string;
  maxBitrate: number;
  maxFramerate: number;
  scaleResolutionDownBy: number;
}

export const SIMULCAST_LAYERS: SimulcastLayer[] = [
  { rid: 'high', maxBitrate: 2_500_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  { rid: 'mid', maxBitrate: 1_000_000, maxFramerate: 24, scaleResolutionDownBy: 2 },
  { rid: 'low', maxBitrate: 400_000, maxFramerate: 15, scaleResolutionDownBy: 4 },
];

/**
 * Configure simulcast on a peer connection's video sender.
 * Must be called AFTER addTrack but BEFORE createOffer/createAnswer.
 */
export function enableSimulcast(pc: RTCPeerConnection): void {
  const senders = pc.getSenders();
  const videoSender = senders.find(s => s.track?.kind === 'video');
  if (!videoSender) return;

  const params = videoSender.getParameters();
  if (!params.encodings || params.encodings.length === 0) {
    params.encodings = [{}];
  }

  // Set up three simulcast layers
  params.encodings = SIMULCAST_LAYERS.map(layer => ({
    rid: layer.rid,
    maxBitrate: layer.maxBitrate,
    maxFramerate: layer.maxFramerate,
    scaleResolutionDownBy: layer.scaleResolutionDownBy,
    active: true,
  }));

  try {
    videoSender.setParameters(params);
  } catch {
    // Fallback: single encoding with max bitrate
    params.encodings = [{ maxBitrate: 2_500_000 }];
    try { videoSender.setParameters(params); } catch {}
  }
}

/**
 * Disable a specific simulcast layer (e.g., when network is constrained).
 */
export function setLayerActive(pc: RTCPeerConnection, rid: string, active: boolean): void {
  const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
  if (!videoSender) return;

  const params = videoSender.getParameters();
  const encoding = params.encodings.find((e: any) => e.rid === rid);
  if (encoding) {
    encoding.active = active;
    try { videoSender.setParameters(params); } catch {}
  }
}
