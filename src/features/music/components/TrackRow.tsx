import { Play, Pause } from 'lucide-react';
import type { Track } from '../types';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { formatDuration } from '../lib/formatDuration';

export default function TrackRow({
  track,
  queue,
  index,
}: {
  track: Track;
  queue?: Track[];
  index?: number;
}) {
  const load = usePlayerStore((s) => s.loadTrack);
  const toggle = usePlayerStore((s) => s.toggle);
  const isCurrent = usePlayerStore(
    (s) => s.queue[s.currentIndex]?.id === track.id,
  );
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);
  const playable = track.audio_status === 'ready' && !!track.audio_mux_playback_id;

  return (
    <button
      disabled={!playable}
      onClick={() => {
        if (isCurrent) return toggle();
        const filtered = queue?.filter(
          (t) => t.audio_status === 'ready' && !!t.audio_mux_playback_id,
        );
        load(track, filtered);
      }}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="w-6 text-center text-white/40 text-xs">
        {isCurrent ? (
          isPlaying ? (
            <Pause className="w-4 h-4 mx-auto text-white" />
          ) : (
            <Play className="w-4 h-4 mx-auto text-white" />
          )
        ) : (
          (index ?? 0) + 1
        )}
      </span>
      <div
        className="w-10 h-10 rounded-md flex-shrink-0"
        style={{
          background: track.cover_art_url
            ? `url(${track.cover_art_url}) center/cover`
            : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{track.title}</div>
        <div className="text-xs text-white/50 truncate">
          {playable ? track.genre || 'Music' : 'Processing…'}
        </div>
      </div>
      <span className="text-xs text-white/40">{formatDuration(track.duration_seconds)}</span>
    </button>
  );
}
