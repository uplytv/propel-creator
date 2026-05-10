import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePlaylist } from '../hooks/useTrack';
import TrackRow from '../components/TrackRow';

export default function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { data, isLoading } = usePlaylist(playlistId);
  if (isLoading) return <div className="p-8 text-white/50">Loading…</div>;
  if (!data?.playlist) return <div className="p-8 text-white/50">Playlist not found.</div>;
  const { playlist, tracks } = data;
  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
      <Link to="/music/library" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Library
      </Link>
      <h1 className="text-3xl font-black text-white">{playlist.title}</h1>
      <p className="text-sm text-white/50 mb-6">{tracks.length} tracks</p>
      <div className="space-y-1">
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} queue={tracks} index={i} />
        ))}
      </div>
    </div>
  );
}
