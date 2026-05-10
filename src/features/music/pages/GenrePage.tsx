import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchTracksByGenre } from '../lib/musicQueries';
import TrackCard from '../components/TrackCard';

export default function GenrePage() {
  const { genre = '' } = useParams<{ genre: string }>();
  const decoded = decodeURIComponent(genre);
  const { data: tracks } = useQuery({
    queryKey: ['music', 'genre', decoded],
    queryFn: () => fetchTracksByGenre(decoded),
  });
  return (
    <div className="pb-40 max-w-5xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>
      <h1
        className="text-3xl font-black mb-6"
        style={{
          background: 'linear-gradient(90deg,#3D7CFF,#B025FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {decoded}
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {(tracks ?? []).map((t) => (
          <TrackCard key={t.id} track={t} queue={tracks} />
        ))}
        {!tracks?.length && <p className="text-sm text-white/40">No tracks yet in {decoded}.</p>}
      </div>
    </div>
  );
}
