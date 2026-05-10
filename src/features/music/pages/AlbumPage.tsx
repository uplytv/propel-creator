import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAlbum } from '../hooks/useTrack';
import TrackRow from '../components/TrackRow';

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data, isLoading } = useAlbum(albumId);

  if (isLoading) return <div className="p-8 text-white/50">Loading…</div>;
  if (!data?.album) return <div className="p-8 text-white/50">Album not found.</div>;

  const { album, tracks } = data;
  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>
      <div className="flex gap-4 items-end">
        <div
          className="w-40 h-40 rounded-2xl"
          style={{
            background: album.cover_art_url
              ? `url(${album.cover_art_url}) center/cover`
              : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
          }}
        />
        <div>
          <div className="text-xs uppercase text-white/50">{album.album_type}</div>
          <h1 className="text-3xl font-black text-white">{album.title}</h1>
        </div>
      </div>
      <div className="mt-6 space-y-1">
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} queue={tracks} index={i} />
        ))}
      </div>
    </div>
  );
}
