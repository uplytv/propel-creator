import { Link } from 'react-router-dom';
import { Upload, Library, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMusicFeed } from '../hooks/useMusicFeed';
import TrackCard from '../components/TrackCard';
import GenreChip from '../components/GenreChip';
import { GENRES } from '../lib/genres';

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white px-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-6 sm:overflow-visible">
        {children}
      </div>
    </section>
  );
}

export default function MusicHome() {
  const { user } = useAuth();
  const { data, isLoading } = useMusicFeed(user?.id);

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-black"
            style={{
              background: 'linear-gradient(90deg,#3D7CFF,#B025FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            uply music
          </h1>
          <p className="text-xs text-white/50">stream what creators are dropping</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/music/search"
            className="p-2 rounded-full bg-white/5 text-white"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link
            to="/music/library"
            className="p-2 rounded-full bg-white/5 text-white"
            aria-label="Library"
          >
            <Library className="w-5 h-5" />
          </Link>
          <Link
            to="/music/upload"
            className="px-4 py-2 rounded-full text-white font-semibold flex items-center gap-1.5 text-sm"
            style={{ background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
          >
            <Upload className="w-4 h-4" /> Upload
          </Link>
        </div>
      </header>

      <div className="space-y-8">
        <Row title="For You">
          {(data?.forYou ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data?.forYou} />
          ))}
          {!isLoading && !data?.forYou.length && (
            <div className="text-sm text-white/40 px-1">Nothing yet — check back soon.</div>
          )}
        </Row>

        <Row title="New Releases">
          {(data?.newReleases ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data?.newReleases} />
          ))}
        </Row>

        <Row title="Trending Now">
          {(data?.trending ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data?.trending} />
          ))}
        </Row>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white px-4">Browse by Genre</h2>
          <div className="flex gap-2 overflow-x-auto px-4 pb-2">
            {GENRES.map((g) => (
              <GenreChip key={g} genre={g} />
            ))}
          </div>
        </section>

        {user && (data?.following?.length ?? 0) > 0 && (
          <Row title="From Creators You Follow">
            {(data?.following ?? []).map((t: any) => (
              <TrackCard key={t.id} track={t} queue={data?.following} />
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
