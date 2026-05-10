import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Loader2, AlertTriangle, Share2 } from 'lucide-react';
import { useTrack } from '../hooks/useTrack';
import { useTrackProcessing } from '../hooks/useTrackProcessing';
import { usePlayerStore } from '../hooks/usePlayerStore';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import ShareTrackSheet from '../components/ShareTrackSheet';
import RepostButton from '../components/RepostButton';
import PresaveButton from '../components/PresaveButton';
import DownloadButton from '../components/DownloadButton';
import StartPartyButton from '../components/StartPartyButton';
import { formatDuration } from '../lib/formatDuration';

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading } = useTrack(id);
  useTrackProcessing(track);
  const load = usePlayerStore((s) => s.loadTrack);
  const toggle = usePlayerStore((s) => s.toggle);
  const isCurrent = usePlayerStore((s) => s.queue[s.currentIndex]?.id === track?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) return <div className="p-8 text-white/50">Loading…</div>;
  if (!track) return <div className="p-8 text-white/50">Track not found.</div>;

  const ready = track.audio_status === 'ready' && !!track.audio_mux_playback_id;
  const errored = track.audio_status === 'errored';
  const processing = !ready && !errored;

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
          {processing && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing audio… we'll auto-refresh when it's ready.
            </div>
          )}
          {errored && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Mux processing failed. Try re-uploading.
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              disabled={!ready}
              onClick={() => (isCurrent ? toggle() : load(track))}
              className="px-5 py-2.5 rounded-full text-white font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {!ready ? 'Not ready' : isPlaying ? 'Pause' : 'Play'}
            </button>
            <LikeButton trackId={track.id} />
            <RepostButton trackId={track.id} />
            <AddToPlaylistMenu trackId={track.id} />
            {ready && <DownloadButton trackId={track.id} />}
            {!ready && <PresaveButton trackId={track.id} />}
            <button
              onClick={() => setShareOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-white inline-flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <StartPartyButton />
          </div>
        </div>
      </div>
      <ShareTrackSheet track={track} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
