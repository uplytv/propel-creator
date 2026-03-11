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
}

export const UPLYMuxPlayer = ({
  playbackId,
  title,
  autoPlay = false,
  muted = false,
  className,
  streamType = 'on-demand',
}: MuxPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'retrying' | 'failed'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;

  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const isLive = streamType === 'live' || streamType === 'll-live';

  const destroyHls = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;

    destroyHls();
    setStatus('loading');

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        lowLatencyMode: true,
        backBufferLength: 90,
        ...(isLive ? { enableWorker: true } : {}),
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing');
        setRetryCount(0);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data.type, data.details);
          
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Auto-retry for network errors (stream starting up)
            setRetryCount(prev => {
              const next = prev + 1;
              if (next <= maxRetries) {
                setStatus('retrying');
                retryTimerRef.current = setTimeout(() => {
                  hls.loadSource(hlsUrl);
                  hls.attachMedia(video);
                }, 5000);
              } else {
                setStatus('failed');
              }
              return next;
            });
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setStatus('failed');
          }
        }
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing');
        if (autoPlay) video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setRetryCount(prev => {
          const next = prev + 1;
          if (next <= maxRetries) {
            setStatus('retrying');
            retryTimerRef.current = setTimeout(() => {
              video.src = hlsUrl;
              video.load();
            }, 5000);
          } else {
            setStatus('failed');
          }
          return next;
        });
      });
    } else {
      setStatus('failed');
    }
  }, [playbackId, hlsUrl, isLive, autoPlay, destroyHls]);

  useEffect(() => {
    initHls();
    return destroyHls;
  }, [initHls, destroyHls]);

  const { isPip, togglePip, containerRef } = useAutoPip(videoRef, status === 'playing');

  const handleManualRetry = () => {
    setRetryCount(0);
    initHls();
  };

  return (
    <div ref={containerRef} className={`relative w-full aspect-video bg-black ${className || ''}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls={status === 'playing'}
        className="w-full h-full object-contain"
        style={{ display: status === 'playing' ? 'block' : 'none' }}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to stream...</p>
        </div>
      )}

      {status === 'retrying' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-white font-medium">
            {isLive ? 'Stream is starting... hang tight.' : 'Reconnecting...'}
          </p>
          <p className="text-xs text-white/60">Attempt {retryCount} of {maxRetries}</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-white font-medium">
            {isLive
              ? 'This stream may have ended. Refresh to check.'
              : 'Stream interrupted. Tap to reconnect.'}
          </p>
          <Button variant="outline" size="sm" onClick={handleManualRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
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
