import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Loader2, RefreshCw, WifiOff, PictureInPicture2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoPip } from '@/hooks/useAutoPip';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  streamType?: 'on-demand' | 'live' | 'll-live';
  /** Called once when the underlying <video> element is ready, so callers can read currentTime for watch-time tracking. */
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}

export const UPLYMuxPlayer = ({
  playbackId,
  title,
  autoPlay = false,
  muted = false,
  className,
  streamType = 'on-demand',
  onVideoRef,
}: MuxPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'retrying' | 'failed'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;
  const isLive = streamType === 'live' || streamType === 'll-live';
  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  const destroyHls = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;
    destroyHls();
    setStatus('loading');

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Low latency live settings
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        lowLatencyMode: true,
        backBufferLength: 120,
        enableWorker: true,
        // Never give up on network issues — orientation/tab switch resilience
        fragLoadingTimeOut: 30000,
        manifestLoadingTimeOut: 30000,
        levelLoadingTimeOut: 30000,
        fragLoadingMaxRetry: isLive ? 999 : 5,
        manifestLoadingMaxRetry: isLive ? 999 : 5,
        levelLoadingMaxRetry: isLive ? 999 : 5,
        fragLoadingRetryDelay: 1000,
        manifestLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing');
        setRetryCount(0);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (isLive) {
            // Live streams never fail — silently resume
            setStatus('retrying');
            retryTimerRef.current = setTimeout(() => {
              hls.loadSource(hlsUrl);
              hls.startLoad();
            }, 2000);
          } else {
            setRetryCount(prev => {
              const next = prev + 1;
              if (next <= maxRetries) {
                setStatus('retrying');
                retryTimerRef.current = setTimeout(() => { hls.loadSource(hlsUrl); hls.attachMedia(video); }, 5000);
              } else { setStatus('failed'); }
              return next;
            });
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else if (!isLive) {
          setStatus('failed');
        } else {
          // Live: always try to recover
          retryTimerRef.current = setTimeout(() => initHls(), 3000);
        }
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing');
        if (autoPlay) video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        if (isLive) {
          // iOS Safari live: reload silently after rotation or interruption
          setTimeout(() => { video.src = hlsUrl; video.load(); video.play().catch(() => {}); }, 2000);
        } else {
          setRetryCount(prev => {
            const next = prev + 1;
            if (next <= maxRetries) {
              setStatus('retrying');
              retryTimerRef.current = setTimeout(() => { video.src = hlsUrl; video.load(); }, 5000);
            } else { setStatus('failed'); }
            return next;
          });
        }
      });
    } else {
      setStatus('failed');
    }
  }, [playbackId, hlsUrl, isLive, autoPlay, destroyHls]);

  useEffect(() => {
    initHls();
    return destroyHls;
  }, [initHls, destroyHls]);

  // Survive orientation change and tab switch — never drop a live stream
  useEffect(() => {
    if (!isLive) return;

    const resume = () => {
      setTimeout(() => {
        if (!hlsRef.current || !videoRef.current) return;
        try { hlsRef.current.startLoad(); videoRef.current.play().catch(() => {}); } catch {}
      }, 300);
    };

    const onVisibility = () => { if (!document.hidden) resume(); };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('orientationchange', resume);
    try { screen.orientation?.addEventListener('change', resume); } catch {}

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('orientationchange', resume);
      try { screen.orientation?.removeEventListener('change', resume); } catch {}
    };
  }, [isLive]);

  const { isPip, togglePip, containerRef } = useAutoPip(videoRef, status === 'playing');

  return (
    <div ref={containerRef} className={`relative w-full aspect-video bg-black ${className || ''}`}>
      { }
      <video
        ref={(el) => { (videoRef as any).current = el; onVideoRef?.(el); }}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        // @ts-ignore
        webkit-playsinline=""
        controls={status === 'playing'}
        className="w-full h-full object-contain"
        style={{ display: status === 'playing' ? 'block' : 'none' }}
      />

      {(status === 'loading') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to stream...</p>
        </div>
      )}

      {status === 'retrying' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-foreground font-medium">
            {isLive ? 'Reconnecting...' : `Retrying (${retryCount}/${maxRetries})`}
          </p>
        </div>
      )}

      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">
            {isLive ? 'Stream interrupted. Tap to reconnect.' : 'Playback failed.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => { setRetryCount(0); initHls(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      )}

      {status === 'playing' && document.pictureInPictureEnabled && (
        <button
          onClick={togglePip}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors"
          title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
        >
          <PictureInPicture2 className={`w-4 h-4 ${isPip ? 'text-primary' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default UPLYMuxPlayer;
