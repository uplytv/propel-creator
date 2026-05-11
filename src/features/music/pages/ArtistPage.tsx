import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useArtistProfile } from '../hooks/useArtistProfile';
import ArtistHeader from '../components/ArtistHeader';
import ArtistSpotlightEditor from '../components/ArtistSpotlightEditor';
import TrackCard from '../components/TrackCard';
import TrackRow from '../components/TrackRow';
import AlbumCard from '../components/AlbumCard';

const sb = supabase as unknown as any;

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const userId = id;
  const { data: profile } = useArtistProfile(userId);

  const { data: profileBasic } = useQuery({
    queryKey: ['music', 'artist-basic', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb
        .from('profiles')
        .select('id,username,display_name,avatar_url')
        .eq('id', userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['music', 'artist-tracks', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb
        .from('tracks')
        .select('*')
        .eq('creator_id', userId)
        .eq('is_published', true)
        .order('play_count', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: albums = [] } = useQuery({
    queryKey: ['music', 'artist-albums', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb
        .from('albums')
        .select('*')
        .eq('creator_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: reposts = [] } = useQuery({
    queryKey: ['music', 'artist-reposts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: rps } = await sb
        .from('track_reposts')
        .select('track_id,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      const ids = (rps ?? []).map((r: any) => r.track_id);
      if (!ids.length) return [];
      const { data: ts } = await sb.from('tracks').select('*').in('id', ids);
      return ts ?? [];
    },
  });

  if (!userId) return null;

  const popular = tracks.slice(0, 10);
  const recent = [...tracks]
    .sort((a: any, b: any) =>
      (b.created_at as string).localeCompare(a.created_at as string)
    )
    .slice(0, 10);

  const monthly = (profile as any)?.monthly_listeners_cache ?? 0;
  const displayName = profileBasic?.display_name || profileBasic?.username || 'Artist';

  return (
    <div className="pb-32 px-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mt-3">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>
      <ArtistHeader
        profile={profile ?? null}
        displayName={displayName}
        username={profileBasic?.username ?? undefined}
        monthlyListeners={monthly}
      />

      <ArtistSpotlightEditor userId={userId} />

      {popular.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-white mb-2">Popular</h2>
          <div>
            {popular.map((t: any, i: number) => (
              <TrackRow key={t.id} track={t} queue={popular} index={i} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-white mb-3">Recent uploads</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {recent.map((t: any) => (
              <TrackCard key={t.id} track={t} queue={recent} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-white mb-3">Albums</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {albums.map((a: any) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </section>
      )}

      {reposts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-white mb-3">Reposts</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {reposts.map((t: any) => (
              <TrackCard key={t.id} track={t} queue={reposts} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
