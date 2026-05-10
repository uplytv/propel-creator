import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { useTrack } from '../hooks/useTrack';
import { usePlayerStore } from '../hooks/usePlayerStore';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import { formatDuration } from '../lib/formatDuration';

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading } = useTrack(id);
  const load = usePlayerStore((s) => s.loadTrack);
  const toggle = usePlayerStore((s) => s.toggle);
  const isCurrent = usePlayerStore((s) => s.queue[s.currentIndex]?.id === track?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);

  if (isLoading) return <div className="p-8 text-white/50">Loading…</div>;
  if (!track) return <div className="p-8 text-white/50">Track not found.</div>;

  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div
          className="w-56 h-56 rounded-2xl flex-shrink-0"
          style={{
            background: track.cover_art_url
              ? `url(${track.cover_art_url}) center/cover`
              : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
            borderRadius: '50%',
            animation: isPlaying ? 'spin 20s linear infinite' : 'none',
          }}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black text-white">{track.title}</h1>
          <p className="text-sm text-white/50 mt-1">
            {track.genre || 'Music'} · {formatDuration(track.duration_seconds)} ·{' '}
            {Number(track.play_count).toLocaleString()} plays
          </p>
          {track.description && (
            <p className="text-sm text-white/70 mt-3 whitespace-pre-line">{track.description}</p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => (isCurrent ? toggle() : load(track))}
              className="px-5 py-2.5 rounded-full text-white font-bold flex items-center gap-2"
              style={{ background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <LikeButton trackId={track.id} />
            <AddToPlaylistMenu trackId={track.id} />
            <button
              disabled
              className="px-3 py-1.5 rounded-full text-xs border border-white/15 text-white/40 cursor-not-allowed"
              title="Coming soon"
            >
              💸 Tip the artist (coming soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
