import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Loader2, RefreshCw, WifiOff, PictureInPicture2, Settings, ListVideo, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoPip } from '@/hooks/useAutoPip';

export interface PlayerChapter {
  title: string;
  start_seconds: number;
}

interface QualityLevel {
  levelIndex: number;
  height: number;
}

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  streamType?: 'on-demand' | 'live' | 'll-live';
  /** Called once when the underlying <video> element is ready, so callers can read currentTime for watch-time tracking. */
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  /** VOD chapter markers (video_chapters rows) — renders progress-bar ticks + a clickable chapter list. */
  chapters?: PlayerChapter[];
  /** Mux signed-playback JWT (aud "v"). When set, the HLS URL carries ?token= — required for signed-policy playback ids (PPV). */
  playbackToken?: string;
  /**
   * Fired on fatal playback errors so the owner can refresh an expired signed
   * token (they live 6h). Callers guard on token age, so firing on any fatal
   * error is safe. A refreshed token changes the HLS URL and re-inits playback.
   */
  onPlaybackForbidden?: () => void;
}

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export const UPLYMuxPlayer = ({
  playbackId,
  title,
  autoPlay = false,
  muted = false,
  className,
  streamType = 'on-demand',
  onVideoRef,
  chapters,
  playbackToken,
  onPlaybackForbidden,
}: MuxPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'retrying' | 'failed'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;
  const isLive = streamType === 'live' || streamType === 'll-live';
  const hlsUrl = playbackToken
    ? `https://stream.mux.com/${playbackId}.m3u8?token=${encodeURIComponent(playbackToken)}`
    : `https://stream.mux.com/${playbackId}.m3u8`;

  // Ref so token-expiry notifications don't churn initHls's identity.
  const onPlaybackForbiddenRef = useRef(onPlaybackForbidden);
  useEffect(() => { onPlaybackForbiddenRef.current = onPlaybackForbidden; });

  // Quality selector — only when hls.js attaches (native-HLS Safari has no
  // levels API, so the menu stays hidden there).
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(-1); // -1 = Auto
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);

  // Chapters — VOD only
  const hasChapters = !isLive && !!chapters && chapters.length > 0;
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const destroyHls = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;
    destroyHls();
    setStatus('loading');
    setQualities([]);
    setSelectedLevel(-1);
    setQualityMenuOpen(false);

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
        // Expose available renditions for the quality menu (dedupe by height,
        // keep the highest-bitrate level per height).
        const byHeight = new Map<number, number>();
        hls.levels.forEach((level, index) => {
          if (!level.height) return;
          byHeight.set(level.height, index);
        });
        setQualities(
          [...byHeight.entries()]
            .map(([height, levelIndex]) => ({ height, levelIndex }))
            .sort((a, b) => b.height - a.height)
        );
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        // Signed-playback token may have expired (403 mid-watch). The owner's
        // handler is age-guarded, so notifying on every fatal error is safe;
        // a refreshed token changes hlsUrl and re-initializes playback.
        onPlaybackForbiddenRef.current?.();
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
        // Native HLS (Safari) can't expose HTTP status — same age-guarded
        // token-refresh notification as the hls.js path.
        onPlaybackForbiddenRef.current?.();
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

  // Track time/duration for the chapter strip (VOD with chapters only)
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasChapters) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onDuration = () => {
      const d = el.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDuration);
    el.addEventListener('durationchange', onDuration);
    onDuration();
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDuration);
      el.removeEventListener('durationchange', onDuration);
    };
  }, [hasChapters, playbackId]);

  const seekTo = useCallback((seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seconds;
    el.play().catch(() => {});
  }, []);

  const selectQuality = useCallback((levelIndex: number) => {
    setSelectedLevel(levelIndex);
    setQualityMenuOpen(false);
    if (hlsRef.current) hlsRef.current.currentLevel = levelIndex; // -1 = Auto (ABR)
  }, []);

  const { isPip, togglePip, containerRef } = useAutoPip(videoRef, status === 'playing');

  const showQualityMenuButton = status === 'playing' && !!hlsRef.current && qualities.length > 1;
  const activeChapterIdx = hasChapters
    ? chapters!.reduce((acc, c, i) => (currentTime >= c.start_seconds ? i : acc), 0)
    : -1;

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

      {/* Chapter tick strip — clickable mini progress bar with markers (VOD) */}
      {status === 'playing' && hasChapters && duration > 0 && (
        <div
          className="absolute top-0 left-0 right-0 z-10 h-4 cursor-pointer group/chapters"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            seekTo(ratio * duration);
          }}
          title="Seek"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 group-hover/chapters:h-1.5 transition-all">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min((currentTime / duration) * 100, 100)}%` }}
            />
          </div>
          {chapters!.map((c, i) => (
            <button
              key={`${c.start_seconds}-${i}`}
              onClick={(e) => { e.stopPropagation(); seekTo(c.start_seconds); }}
              className="absolute top-0 -translate-x-1/2 h-2.5 w-[3px] bg-white/90 hover:bg-primary hover:h-3.5 transition-all"
              style={{ left: `${Math.min((c.start_seconds / duration) * 100, 100)}%` }}
              title={`${fmtTime(c.start_seconds)} — ${c.title}`}
              aria-label={`Jump to chapter: ${c.title}`}
            />
          ))}
        </div>
      )}

      {/* Top-right controls: quality, chapters, PiP */}
      {status === 'playing' && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {showQualityMenuButton && (
            <button
              onClick={() => { setQualityMenuOpen((o) => !o); setChapterListOpen(false); }}
              className="p-2 rounded-lg bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors"
              title="Quality"
              aria-label="Quality"
            >
              <Settings className={`w-4 h-4 ${selectedLevel !== -1 ? 'text-primary' : ''}`} />
            </button>
          )}
          {hasChapters && (
            <button
              onClick={() => { setChapterListOpen((o) => !o); setQualityMenuOpen(false); }}
              className="p-2 rounded-lg bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors"
              title="Chapters"
              aria-label="Chapters"
            >
              <ListVideo className={`w-4 h-4 ${chapterListOpen ? 'text-primary' : ''}`} />
            </button>
          )}
          {document.pictureInPictureEnabled && (
            <button
              onClick={togglePip}
              className="p-2 rounded-lg bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors"
              title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
            >
              <PictureInPicture2 className={`w-4 h-4 ${isPip ? 'text-primary' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Quality menu — hls.js levels (Auto + available heights) */}
      {status === 'playing' && qualityMenuOpen && showQualityMenuButton && (
        <div className="absolute top-12 right-3 z-20 min-w-[120px] rounded-lg bg-background/90 backdrop-blur-md border border-border overflow-hidden">
          {[{ levelIndex: -1, height: 0 }, ...qualities].map((q) => (
            <button
              key={q.levelIndex}
              onClick={() => selectQuality(q.levelIndex)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
            >
              <span>{q.levelIndex === -1 ? 'Auto' : `${q.height}p`}</span>
              {selectedLevel === q.levelIndex && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}

      {/* Chapter list — clickable, active chapter highlighted */}
      {status === 'playing' && chapterListOpen && hasChapters && (
        <div className="absolute top-12 right-3 z-20 w-60 max-h-[60%] overflow-y-auto rounded-lg bg-background/90 backdrop-blur-md border border-border">
          {chapters!.map((c, i) => (
            <button
              key={`${c.start_seconds}-${i}`}
              onClick={() => { seekTo(c.start_seconds); setChapterListOpen(false); }}
              className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-secondary/60 transition-colors ${
                i === activeChapterIdx ? 'bg-primary/10' : ''
              }`}
            >
              <span className={`text-[10px] font-mono mt-0.5 ${i === activeChapterIdx ? 'text-primary' : 'text-muted-foreground'}`}>
                {fmtTime(c.start_seconds)}
              </span>
              <span className="text-xs font-medium text-foreground line-clamp-2">{c.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UPLYMuxPlayer;
