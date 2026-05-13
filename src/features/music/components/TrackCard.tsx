import { Link } from 'react-router-dom';
import { Play, Heart, Repeat2, MessageCircle } from 'lucide-react';
import type { Track } from '../types';
import { usePlayerStore } from '../hooks/usePlayerStore';
import RepostButton from './RepostButton';
import StartStationButton from './StartStationButton';

export default function TrackCard({ track, queue }: { track: Track; queue?: Track[] }) {
  const load = usePlayerStore((s) => s.loadTrack);
  const playable = track.audio_status === 'ready' && !!track.audio_mux_playback_id;
  const repostCount = (track as any).repost_count ?? 0;
  const commentCount = (track as any).comment_count ?? 0;
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
        <div className="flex items-center justify-between gap-1">
          <Link
            to={`/music/track/${track.id}`}
            className="block text-sm font-semibold text-white truncate hover:underline flex-1"
          >
            {track.title}
          </Link>
          <RepostButton trackId={track.id} size="sm" />
          <StartStationButton
            seed={{ seedType: 'track', seedId: track.id, seedName: track.title }}
            firstTrack={track}
          />
        </div>
        <div className="text-xs text-white/50 truncate">{track.genre || 'Music'}</div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
          <span className="inline-flex items-center gap-0.5">
            <Play className="w-2.5 h-2.5" /> {Number(track.play_count || 0).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Heart className="w-2.5 h-2.5" /> {track.like_count || 0}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Repeat2 className="w-2.5 h-2.5" /> {repostCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5" /> {commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
