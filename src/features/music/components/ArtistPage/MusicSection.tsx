import { useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import SectionHeader from './SectionHeader';
import TrackCardHorizontal from './TrackCardHorizontal';

const sb = supabase as unknown as any;

interface Props {
  userId: string;
  mode: 'public' | 'app';
}

type SubTab = 'songs' | 'albums' | 'playlists';

export default function MusicSection({ userId, mode }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: songs = [] } = useQuery({
    queryKey: ['artistpage', 'songs', userId],
    queryFn: async () => {
      const { data } = await sb.from('tracks').select('*').eq('creator_id', userId).eq('category', 'song').eq('is_published', true).order('play_count', { ascending: false }).limit(30);
      return data ?? [];
    },
  });
  const { data: albums = [] } = useQuery({
    queryKey: ['artistpage', 'albums', userId],
    queryFn: async () => {
      const { data } = await sb.from('albums').select('*').eq('creator_id', userId).eq('is_published', true).order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const { data: playlists = [] } = useQuery({
    queryKey: ['artistpage', 'playlists', userId],
    queryFn: async () => {
      const { data } = await sb.from('music_playlists').select('*').eq('user_id', userId).eq('is_public', true).order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const tabs = useMemo(() => {
    const t: { id: SubTab; label: string }[] = [];
    if (songs.length) t.push({ id: 'songs', label: 'Songs' });
    if (albums.length) t.push({ id: 'albums', label: 'Albums' });
    if (playlists.length) t.push({ id: 'playlists', label: 'Playlists' });
    return t;
  }, [songs.length, albums.length, playlists.length]);

  const [active, setActive] = useState<SubTab>('songs');
  const current = active === 'songs' ? songs : active === 'albums' ? albums : playlists;
  if (!tabs.length) return null;
  const effectiveActive = tabs.find((t) => t.id === active)?.id ?? tabs[0].id;

  return (
    <section id="section-music" className="py-10 sm:py-16">
      <SectionHeader title={tabs.find((t) => t.id === effectiveActive)?.label ?? 'Songs'} scrollRef={scrollRef} />
      {tabs.length > 1 && (
        <div className="flex gap-3 justify-center mb-6 px-6 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="px-4 py-1.5 rounded-full text-[14px] font-semibold transition"
              style={{
                border: t.id === effectiveActive ? '1px solid var(--text)' : '1px solid transparent',
                color: t.id === effectiveActive ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide"
      >
        {effectiveActive === 'songs' && songs.map((t: any) => (
          <TrackCardHorizontal key={t.id} track={t} queue={songs} mode={mode} />
        ))}
        {effectiveActive === 'albums' && albums.map((a: any) => (
          <Link
            key={a.id}
            to={mode === 'app' ? `/music/album/${a.id}` : '#'}
            className="flex-shrink-0 snap-start w-[220px]"
            onClick={(e) => mode === 'public' && e.preventDefault()}
          >
            {a.cover_art_url && <img src={a.cover_art_url} alt={a.title} className="w-full aspect-square rounded-2xl object-cover mb-3" />}
            <div className="text-[16px] font-semibold line-clamp-2">{a.title}</div>
          </Link>
        ))}
        {effectiveActive === 'playlists' && playlists.map((p: any) => (
          <Link
            key={p.id}
            to={mode === 'app' ? `/music/playlist/${p.id}` : '#'}
            className="flex-shrink-0 snap-start w-[220px]"
            onClick={(e) => mode === 'public' && e.preventDefault()}
          >
            {p.cover_url && <img src={p.cover_url} alt={p.name} className="w-full aspect-square rounded-2xl object-cover mb-3" />}
            <div className="text-[16px] font-semibold line-clamp-2">{p.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
