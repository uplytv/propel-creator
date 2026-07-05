import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Pause, Play, SkipBack, SkipForward, ListMusic, ChevronUp, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { muxHlsUrl } from '../../lib/musicQueries';
import { formatDuration } from '../../lib/formatDuration';
import { usePlayLogger } from '../../hooks/usePlayLogger';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSleepTimer } from '../../hooks/useSleepTimer';
import { useAutoplayRadio } from '../../hooks/useAutoplayRadio';
import { useGaplessPreload } from '../../hooks/useGaplessPreload';
import { useEqualizer } from '../../hooks/useEqualizer';
import { useRecentlyPlayedLogger } from '../../hooks/useRecentlyPlayed';
import { useMediaSession } from '../../hooks/useMediaSession';
import { Slider } from '@/components/ui/slider';
import LikeButton from '../LikeButton';
import VolumeControl from './VolumeControl';
import QueueDrawer from './QueueDrawer';
import NowPlayingSheet from './NowPlayingSheet';

export default function PersistentPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const xfadeRef = useRef<HTMLAudioElement | null>(null);
  const xfadeHlsRef = useRef<Hls | null>(null);
  const xfadeStartedForRef = useRef<string | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionSeconds = usePlayerStore((s) => s.positionSeconds);
  const durationSeconds = usePlayerStore((s) => s.durationSeconds);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const seekRequest = usePlayerStore((s) => s._seekRequest);
  const crossfadeSeconds = usePlayerStore((s) => s.crossfadeSeconds);
  const station = usePlayerStore((s) => s.station);

  const setPos = usePlayerStore((s) => s._setPosition);
  const setDur = usePlayerStore((s) => s._setDuration);
  const setIsPlaying = usePlayerStore((s) => s._setIsPlaying);
  const consumeSeek = usePlayerStore((s) => s._consumeSeek);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggle = usePlayerStore((s) => s.toggle);
  const sleepRemaining = useSleepTimer();

  usePlayLogger();
  useKeyboardShortcuts();
  useAutoplayRadio();
  useGaplessPreload();
  useMediaSession(audioRef.current);
  useRecentlyPlayedLogger();
  useEqualizer(audioRef);

  const current = queue[currentIndex];
  const nextTrack = queue[currentIndex + 1];
  const playbackId = current?.audio_mux_playback_id || null;

  // Load track when it changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (!playbackId || !current) {
      audioRef.current.removeAttribute('src');
      return;
    }
    if (lastTrackIdRef.current === current.id) return;
    lastTrackIdRef.current = current.id;

    const url = muxHlsUrl(playbackId);
    const audio = audioRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const canNative = audio.canPlayType('application/vnd.apple.mpegurl');
    if (canNative) {
      audio.src = url;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    } else {
      audio.src = url;
    }

    audio.play().catch(() => {});
  }, [playbackId, current?.id]);

  // Honor isPlaying
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.play().catch(() => {});
    else a.pause();
  }, [isPlaying, current?.id]);

  // Volume / muted / playback rate
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
    a.playbackRate = playbackRate;
  }, [volume, muted, playbackRate]);

  // Seek requests
  useEffect(() => {
    if (seekRequest === null) return;
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = consumeSeek() ?? 0;
    } catch {
      /* ignore */
    }
  }, [seekRequest, consumeSeek]);

  // Media Session API
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: 'uply',
      artwork: current.cover_art_url
        ? [{ src: current.cover_art_url, sizes: '512x512', type: 'image/jpeg' }]
        : undefined,
    });
    navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().play());
    navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause());
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    try {
      navigator.mediaSession.setActionHandler('seekto', (e: any) => {
        if (typeof e?.seekTime === 'number') usePlayerStore.getState().seek(e.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', () =>
        usePlayerStore.getState().seek(Math.max(0, usePlayerStore.getState().positionSeconds - 10))
      );
      navigator.mediaSession.setActionHandler('seekforward', () =>
        usePlayerStore.getState().seek(usePlayerStore.getState().positionSeconds + 10)
      );
    } catch {}
  }, [current?.id, next, prev]);

  // Update Media Session position state for OS scrubbers / lock screen
  useEffect(() => {
    if (!('mediaSession' in navigator) || !durationSeconds) return;
    try {
      navigator.mediaSession.setPositionState?.({
        duration: durationSeconds,
        position: Math.min(positionSeconds, durationSeconds),
        playbackRate,
      });
    } catch {}
  }, [positionSeconds, durationSeconds, playbackRate]);

  // Reset xfade tracker when current track changes
  useEffect(() => {
    xfadeStartedForRef.current = null;
    if (xfadeRef.current) {
      try {
        xfadeRef.current.pause();
        xfadeRef.current.removeAttribute('src');
      } catch {}
    }
    if (xfadeHlsRef.current) {
      xfadeHlsRef.current.destroy();
      xfadeHlsRef.current = null;
    }
  }, [current?.id]);

  // Crossfade: when remaining < crossfadeSeconds, ramp out current and ramp in next
  useEffect(() => {
    const xs = crossfadeSeconds;
    if (!xs || xs <= 0) return;
    if (!current || !nextTrack?.audio_mux_playback_id) return;
    if (!durationSeconds || !audioRef.current || !xfadeRef.current) return;

    const remaining = durationSeconds - positionSeconds;
    if (remaining > xs || remaining <= 0) return;

    if (xfadeStartedForRef.current !== nextTrack.id) {
      xfadeStartedForRef.current = nextTrack.id;
      const url = muxHlsUrl(nextTrack.audio_mux_playback_id);
      const x = xfadeRef.current;
      x.volume = 0;
      x.muted = muted;
      x.playbackRate = playbackRate;
      const canNative = x.canPlayType('application/vnd.apple.mpegurl');
      if (canNative) {
        x.src = url;
      } else if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(x);
        xfadeHlsRef.current = hls;
      } else {
        x.src = url;
      }
      x.play().catch(() => {});
    }

    const t = Math.max(0, Math.min(1, 1 - remaining / xs));
    audioRef.current.volume = Math.max(0, volume * (1 - t));
    xfadeRef.current.volume = Math.max(0, volume * t);
  }, [
    positionSeconds,
    durationSeconds,
    crossfadeSeconds,
    current?.id,
    nextTrack?.id,
    nextTrack?.audio_mux_playback_id,
    volume,
    muted,
    playbackRate,
  ]);

  // Hide global player on bare embed routes — the embed page renders its own scoped player.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/embed/')) return null;
  if (!current) return null;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setPos((e.target as HTMLAudioElement).currentTime || 0)}
        onLoadedMetadata={(e) =>
          setDur((e.target as HTMLAudioElement).duration || current.duration_seconds || 0)
        }
        onEnded={() => next()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
        playsInline
      />
      <audio ref={xfadeRef} preload="auto" playsInline />

      <div
        className="fixed left-0 right-0 z-40 backdrop-blur-xl border-t border-white/10"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
          background: 'rgba(10,10,10,0.85)',
        }}
      >
        {/* progress */}
        <div className="px-3 pt-2">
          <Slider
            value={[Math.min(positionSeconds, durationSeconds || 0)]}
            min={0}
            max={Math.max(durationSeconds, 1)}
            step={0.5}
            onValueChange={(v) => usePlayerStore.getState().seek(v[0])}
            className="[&_[data-orientation=horizontal]]:h-1"
          />
          <div className="flex justify-between text-[10px] text-white/50 mt-0.5">
            <span>{formatDuration(positionSeconds)}</span>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
            aria-label="Open now playing"
          >
            <div
              className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0"
              style={{
                background: current.cover_art_url
                  ? `url(${current.cover_art_url}) center/cover`
                  : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
                animation: isPlaying ? 'spin 20s linear infinite' : 'none',
                borderRadius: '50%',
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {station && (
                  <Radio
                    className="w-3 h-3 flex-shrink-0 text-primary"
                    aria-label="Station active"
                  />
                )}
                <div className="text-sm font-semibold text-white truncate">{current.title}</div>
              </div>
              <div className="text-xs text-white/50 truncate">
                {station ? `Station${station.seedName ? ` · ${station.seedName}` : ''}` : current.genre || 'Music'}
              </div>
            </div>
          </button>
          <Link
            to={`/music/track/${current.id}`}
            aria-label="Track page"
            className="hidden sm:inline-flex p-2 text-white/60 hover:text-white"
          >
            <ChevronUp className="w-4 h-4" />
          </Link>
          <LikeButton trackId={current.id} />
          <button
            onClick={prev}
            className="p-2 text-white/80 hover:text-white"
            aria-label="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={next}
            className="p-2 text-white/80 hover:text-white"
            aria-label="Next"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            onClick={() => setQueueOpen(true)}
            aria-label="Queue"
            className="p-2 text-white/70 hover:text-white"
          >
            <ListMusic className="w-5 h-5" />
          </button>
          <VolumeControl />
        </div>
      </div>

      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
      <NowPlayingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
