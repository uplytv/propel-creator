import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Track } from '../types';
import { usePlayerStore } from '../hooks/usePlayerStore';

export default function TrackCard({ track, queue }: { track: Track; queue?: Track[] }) {
  const load = usePlayerStore((s) => s.loadTrack);
  const playable = track.audio_status === 'ready' && !!track.audio_mux_playback_id;
  return (
    <div className="group relative w-40 sm:w-44 flex-shrink-0">
      <Link to={`/music/track/${track.id}`} className="block">
        <div
          className="relative aspect-square rounded-xl overflow-hidden"
          style={{
            background: track.cover_art_url
              ? `url(${track.cover_art_url}) center/cover`
              : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
          }}
        >
          {playable ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                const filtered = queue?.filter(
                  (t) => t.audio_status === 'ready' && !!t.audio_mux_playback_id,
                );
                load(track, filtered);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition opacity-0 group-hover:opacity-100"
              aria-label="Play"
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
              >
                <Play className="w-5 h-5 text-white ml-0.5" />
              </span>
            </button>
          ) : (
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-white/80">
              Processing…
            </div>
          )}
        </div>
      </Link>
      <div className="mt-2 px-0.5">
        <Link
          to={`/music/track/${track.id}`}
          className="block text-sm font-semibold text-white truncate hover:underline"
        >
          {track.title}
        </Link>
        <div className="text-xs text-white/50 truncate">{track.genre || 'Music'}</div>
      </div>
    </div>
  );
}
