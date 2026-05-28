import { Play, Pause, Heart, Repeat2, MessageCircle, Lock } from 'lucide-react';
import type { Track } from '../types';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { formatDuration } from '../lib/formatDuration';
import RepostButton from './RepostButton';
import StartStationButton from './StartStationButton';
import LockedTrackPlayer from './LockedTrackPlayer';
import { useAccess } from '@/hooks/useAccess';

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
  const isLocked = !!(track as any).is_locked;
  const { hasAccess } = useAccess('track', track.id);
  const playable =
    track.audio_status === 'ready' &&
    !!track.audio_mux_playback_id &&
    (!isLocked || hasAccess);

  const repostCount = (track as any).repost_count ?? 0;
  const commentCount = (track as any).comment_count ?? 0;

  if (isLocked && !hasAccess) {
    return (
      <div className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-white/5">
        <span className="w-6 text-center text-white/40 text-xs pt-1">
          <Lock className="w-4 h-4 mx-auto text-white/70" />
        </span>
        <div
          className="w-10 h-10 rounded-md flex-shrink-0"
          style={{
            background: (track as any).cover_art_url
              ? `url(${(track as any).cover_art_url}) center/cover`
              : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate mb-2">{track.title}</div>
          <LockedTrackPlayer
            track={{
              id: track.id,
              title: track.title,
              creator_id: (track as any).creator_id,
              is_locked: true,
              unlock_type: (track as any).unlock_type ?? null,
              unlock_price_cents: (track as any).unlock_price_cents ?? null,
              required_tier_id: (track as any).required_tier_id ?? null,
              preview_url: (track as any).preview_url ?? null,
              preview_duration_seconds: (track as any).preview_duration_seconds ?? 30,
              required_tier_name: (track as any).required_tier_name ?? null,
            }}
          />
        </div>
      </div>
    );
  }



  return (
    <div className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
      <button
        disabled={!playable}
        onClick={() => {
          if (isCurrent) return toggle();
          const filtered = queue?.filter(
            (t) => t.audio_status === 'ready' && !!t.audio_mux_playback_id,
          );
          load(track, filtered);
        }}
        className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex items-center gap-2 text-[10px] text-white/40 truncate">
            <span>{playable ? track.genre || 'Music' : 'Processing…'}</span>
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
        <span className="text-xs text-white/40">{formatDuration(track.duration_seconds)}</span>
      </button>
      <RepostButton trackId={track.id} size="sm" />
      <StartStationButton
        seed={{ seedType: 'track', seedId: track.id, seedName: track.title }}
        firstTrack={track}
      />
    </div>
  );
}
