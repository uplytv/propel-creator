import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrack } from '../hooks/useTrack';
import { muxHlsUrl } from '../lib/musicQueries';
import { formatDuration } from '../lib/formatDuration';

export default function EmbedPlayer({ trackId }: { trackId: string }) {
  const { data: track } = useTrack(trackId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  const ready = track?.audio_status === 'ready' && !!track?.audio_mux_playback_id;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !ready || !track?.audio_mux_playback_id) return;
    const url = muxHlsUrl(track.audio_mux_playback_id);
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    } else {
      audio.src = url;
    }
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [ready, track?.audio_mux_playback_id]);

  if (!track) return <div className="p-4 text-white/40 text-sm">Loading…</div>;

  const progress = dur > 0 ? (pos / dur) * 100 : 0;

  return (
    <div className="bg-[#0A0A0A] text-white p-3 flex items-center gap-3 h-full">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setPos((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
      />
      <div
        className="w-16 h-16 rounded-lg flex-shrink-0"
        style={{
          background: track.cover_art_url
            ? `url(${track.cover_art_url}) center/cover`
            : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
        }}
      />
      <div className="flex-1 min-w-0">
        <Link
          to={`/music/track/${track.id}`}
          target="_blank"
          className="block text-sm font-bold truncate hover:underline"
        >
          {track.title}
        </Link>
        <div className="text-xs text-white/50 truncate">
          {track.genre || 'Music'} · {Number(track.play_count).toLocaleString()} plays
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full"
            style={{ width: `${progress}%`, background: '#3D7CFF' }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/50 mt-0.5">
          <span>{formatDuration(pos)}</span>
          <span>{formatDuration(dur || track.duration_seconds || 0)}</span>
        </div>
      </div>
      <button
        disabled={!ready}
        onClick={() => {
          const a = audioRef.current;
          if (!a) return;
          if (a.paused) a.play().catch(() => {});
          else a.pause();
        }}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-black disabled:opacity-30"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
    </div>
  );
}
