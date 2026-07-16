import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, WifiOff, RefreshCw, PictureInPicture2, Maximize, Minimize, Wifi, Radio, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoPip } from '@/hooks/useAutoPip';
import { ICE_SERVERS, preferLowLatencyCodecs } from '@/lib/webrtcConfig';
import { useConnectionQuality } from '@/hooks/useConnectionQuality';
import Hls from 'hls.js';
import ViewerClipButton from './ViewerClipButton';
import { Sentry } from "@/lib/sentry";

interface WebRTCPlayerProps {
  streamId: string;
  playbackId?: string;
  /** Mux signed-playback JWT (aud "v") — required by the HLS fallback when the playback id is signed-policy (PPV). */
  playbackToken?: string;
  title?: string;
  className?: string;
}

type TransportMode = 'webrtc' | 'hls';

export default function WebRTCPlayer({ streamId, playbackId, playbackToken, title, className }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const viewerIdRef = useRef(crypto.randomUUID());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [status, setStatus] = useState<'connecting' | 'playing' | 'reconnecting' | 'failed'>('connecting');
  const [transport, setTransport] = useState<TransportMode>('webrtc');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 8;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const webrtcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectionQuality = useConnectionQuality(status === 'playing');

  const cleanupWebRTC = useCallback(() => {
    connectedRef.current = false;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (offerIntervalRef.current) { clearInterval(offerIntervalRef.current); offerIntervalRef.current = null; }
    if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
    if (webrtcTimeoutRef.current) { clearTimeout(webrtcTimeoutRef.current); webrtcTimeoutRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    iceCandidateQueueRef.current = [];
  }, []);

  const cleanupHLS = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  const cleanup = useCallback(() => {
    cleanupWebRTC();
    cleanupHLS();
  }, [cleanupWebRTC, cleanupHLS]);

  // ── HLS Fallback ──
  const startHLSFallback = useCallback(() => {
    if (!playbackId) {
      setStatus('failed');
      return;
    }
    cleanupWebRTC();
    setTransport('hls');
    setStatus('connecting');

    const hlsUrl = playbackToken
      ? `https://stream.mux.com/${playbackId}.m3u8?token=${encodeURIComponent(playbackToken)}`
      : `https://stream.mux.com/${playbackId}.m3u8`;
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        enableWorker: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus('playing');
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            setStatus('failed');
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setStatus('playing');
      }, { once: true });
    } else {
      setStatus('failed');
    }
  }, [playbackId, playbackToken, cleanupWebRTC]);

  // Monitor WebRTC stats for latency display
  const startStatsMonitor = useCallback((pc: RTCPeerConnection) => {
    statsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            setLatencyMs(Math.round(report.currentRoundTripTime * 1000));
          }
        });
      } catch { /* pc closed */ }
    }, 3000);
  }, []);

  const connect = useCallback(() => {
    cleanupWebRTC();
    setTransport('webrtc');
    setStatus('connecting');
    connectedRef.current = false;

    // If WebRTC doesn't connect within 15s, fall back to HLS
    webrtcTimeoutRef.current = setTimeout(() => {
      if (!connectedRef.current) {
        
        startHLSFallback();
      }
    }, 15000);

    const viewerId = viewerIdRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    preferLowLatencyCodecs(pc);

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        connectedRef.current = true;
        setStatus('playing');
        startStatsMonitor(pc);
        if (webrtcTimeoutRef.current) { clearTimeout(webrtcTimeoutRef.current); webrtcTimeoutRef.current = null; }
        if (offerIntervalRef.current) { clearInterval(offerIntervalRef.current); offerIntervalRef.current = null; }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        connectedRef.current = true;
        setStatus('playing');
        if (webrtcTimeoutRef.current) { clearTimeout(webrtcTimeoutRef.current); webrtcTimeoutRef.current = null; }
        if (offerIntervalRef.current) { clearInterval(offerIntervalRef.current); offerIntervalRef.current = null; }
      } else if (state === 'disconnected') {
        setStatus('reconnecting');
        retryTimerRef.current = setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            reconnect();
          }
        }, 3000);
      } else if (state === 'failed') {
        reconnect();
      }
    };

    const reconnect = () => {
      connectedRef.current = false;
      setRetryCount(prev => {
        const next = prev + 1;
        if (next <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, next - 1), 10000);
          setStatus('reconnecting');
          retryTimerRef.current = setTimeout(connect, delay);
        } else {
          // Exhausted WebRTC retries — fall back to HLS
          
          startHLSFallback();
        }
        return next;
      });
    };

    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    let localOffer: RTCSessionDescriptionInit | null = null;

    channel
      .on('broadcast', { event: 'host-answer' }, async (payload: any) => {
        const msg = payload.payload;
        if (msg.viewerId !== viewerId) return;
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
            for (const candidate of iceCandidateQueueRef.current) {
              try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
            }
            iceCandidateQueueRef.current = [];
            if (offerIntervalRef.current) { clearInterval(offerIntervalRef.current); offerIntervalRef.current = null; }
          }
        } catch (err) { Sentry.captureException(err, { tags: { context: "webrtc_player" } }); }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: any) => {
        const msg = payload.payload;
        if (msg.viewerId !== viewerId || msg.from !== 'host') return;
        if (!pc.remoteDescription) { iceCandidateQueueRef.current.push(msg.candidate); return; }
        try {
          if (pc.signalingState !== 'closed') await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {}
      })
      .subscribe(async (subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({ type: 'broadcast', event: 'ice-candidate', payload: { viewerId, from: 'viewer', candidate: event.candidate.toJSON() } });
            }
          };
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            localOffer = pc.localDescription?.toJSON() || null;

            const sendOffer = () => {
              if (connectedRef.current || !localOffer) return;
              channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId, offer: localOffer } });
            };
            sendOffer();
            offerIntervalRef.current = setInterval(sendOffer, 2000);
          } catch (err) {
            Sentry.captureException(err, { tags: { context: "webrtc_player" } });
            startHLSFallback();
          }
        }
      });
  }, [streamId, cleanupWebRTC, startStatsMonitor, startHLSFallback]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const { isPip, togglePip, containerRef } = useAutoPip(videoRef, status === 'playing');

  const toggleFullscreen = useCallback(() => {
    const el = fullscreenContainerRef.current as any;
    if (!el) return;
    const fullscreenEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (fullscreenEl) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      const tryNative = el.requestFullscreen
        ? el.requestFullscreen()
        : el.webkitRequestFullscreen
        ? Promise.resolve(el.webkitRequestFullscreen())
        : Promise.reject();
      tryNative.catch(() => setIsFullscreen(true));
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape" && isFullscreen) setIsFullscreen(false); };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [isFullscreen]);

  const handleRetry = () => {
    setRetryCount(0);
    connect();
  };

  const setContainerRefs = useCallback((node: HTMLDivElement | null) => {
    (fullscreenContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [containerRef]);

  const qualityColor = connectionQuality.quality === 'excellent' ? 'text-green-400' :
    connectionQuality.quality === 'good' ? 'text-green-400' :
    connectionQuality.quality === 'fair' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div
      ref={setContainerRefs}
      className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[100] h-full' : 'aspect-video'} bg-black ${className || ''}`}
      onTouchEnd={status === 'playing' ? (e) => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) { e.preventDefault(); toggleFullscreen(); }
        lastTapRef.current = now;
      } : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        controls={status === 'playing'}
        className="w-full h-full object-contain"
        style={{ display: status === 'playing' ? 'block' : 'none' }}
      />

      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-white font-medium">
            {transport === 'hls' ? 'Switching to low-latency stream...' : 
             retryCount > 0 ? 'Establishing connection... hang tight.' : 'Connecting to live stream...'}
          </p>
          {retryCount > 0 && transport === 'webrtc' && (
            <p className="text-xs text-white/60">Attempt {retryCount + 1} of {maxRetries + 1}</p>
          )}
        </div>
      )}

      {status === 'reconnecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          <p className="text-sm text-white font-medium">Reconnecting...</p>
          <p className="text-xs text-white/50">Don't worry, we'll get you back in seconds</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-white font-medium text-center px-6">
            Could not connect to the stream. The creator may have ended it or there's a network issue.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry WebRTC
            </Button>
            {playbackId && (
              <Button variant="outline" size="sm" onClick={startHLSFallback} className="gap-2">
                <Radio className="w-4 h-4" /> Try HLS
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Player controls overlay */}
      {status === 'playing' && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* Transport + latency badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
            <Wifi className={`w-3 h-3 ${qualityColor}`} />
            <span className="text-[10px] font-mono text-white/60 uppercase">{transport}</span>
            {latencyMs !== null && transport === 'webrtc' && (
              <span className={`text-[10px] font-mono font-semibold ${qualityColor}`}>
                {latencyMs}ms
              </span>
            )}
            {transport === 'hls' && (
              <span className="text-[10px] font-mono text-white/60">~2s</span>
            )}
          </div>
          {document.pictureInPictureEnabled && (
            <button
              onClick={togglePip}
              className="p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
            >
              <PictureInPicture2 className={`w-4 h-4 ${isPip ? 'text-primary' : ''}`} />
            </button>
          )}
          {/* Viewer clip button */}
          <ViewerClipButton videoRef={videoRef} isPlaying={status === 'playing'} />
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
