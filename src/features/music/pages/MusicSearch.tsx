import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchMusic } from '../lib/musicQueries';
import TrackCard from '../components/TrackCard';
import AlbumCard from '../components/AlbumCard';

export default function MusicSearch() {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['music', 'search', q],
    queryFn: () => searchMusic(q),
    enabled: q.trim().length >= 2,
  });
  return (
    <div className="pb-40 max-w-4xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>
      <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 border border-white/10">
        <Search className="w-4 h-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tracks, albums, artists…"
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
          style={{ fontSize: 16 }}
        />
      </div>
      {data && (
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Tracks</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.tracks.map((t) => (
                <TrackCard key={t.id} track={t} queue={data.tracks} />
              ))}
            </div>
          </div>
          {data.albums.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.albums.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
