import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Track } from '../types';
import { usePlayerStore } from '../hooks/usePlayerStore';

interface Props {
  rank: number;
  track: Track;
  queue?: Track[];
}

export default function ChartTrackRow({ rank, track, queue }: Props) {
  const load = usePlayerStore((s) => s.loadTrack);
  const playable = track.audio_status === 'ready' && !!track.audio_mux_playback_id;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition">
      <div className="w-7 text-center font-black text-white/60 tabular-nums">{rank}</div>
      <Link to={`/music/track/${track.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-12 h-12 rounded-md flex-shrink-0"
          style={{
            background: track.cover_art_url
              ? `url(${track.cover_art_url}) center/cover`
              : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-white text-sm font-semibold truncate">{track.title}</div>
          <div className="text-white/50 text-xs truncate">
            {track.genre ?? 'Music'} · {track.play_count.toLocaleString()} plays
          </div>
        </div>
      </Link>
      {playable && (
        <button
          onClick={() => {
            const filtered = queue?.filter(
              (t) => t.audio_status === 'ready' && !!t.audio_mux_playback_id,
            );
            load(track, filtered);
          }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          aria-label={`Play ${track.title}`}
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </button>
      )}
    </div>
  );
}
