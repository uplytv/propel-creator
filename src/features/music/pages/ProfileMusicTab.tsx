import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchCreatorTracks } from '../lib/musicQueries';
import TrackRow from '../components/TrackRow';
import ArtistHeader from '../components/ArtistHeader';
import ArtistStatsPanel from '../components/ArtistStatsPanel';
import TourDatesList from '../components/TourDatesList';
import MerchGrid from '../components/MerchGrid';
import { useArtistProfile } from '../hooks/useArtistProfile';
import { useArtistStats } from '../hooks/useArtistStats';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export default function ProfileMusicTab() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['music', 'profile-by-username', username],
    queryFn: async () => {
      const { data } = await sb
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .eq('username', username)
        .maybeSingle();
      return data;
    },
    enabled: !!username,
  });

  const userId = profile?.user_id;
  const { data: artistProfile } = useArtistProfile(userId);
  const { data: stats } = useArtistStats(userId);

  const { data: tracks } = useQuery({
    queryKey: ['music', 'profile-tracks', userId],
    queryFn: () => fetchCreatorTracks(userId!),
    enabled: !!userId,
  });

  const isOwner = user?.id && user.id === userId;

  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
      <Link to={`/${username}`} className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> {username}
      </Link>

      <ArtistHeader
        profile={artistProfile ?? null}
        displayName={profile?.display_name || username || 'Artist'}
        username={username}
        monthlyListeners={stats?.monthly_listeners ?? artistProfile?.monthly_listeners_cache ?? 0}
      />

      <section className="mb-8">
        <h2 className="text-white font-bold text-lg mb-3">Popular</h2>
        <div className="space-y-1">
          {(tracks ?? []).map((t, i) => (
            <TrackRow key={t.id} track={t} queue={tracks} index={i} />
          ))}
          {!tracks?.length && <p className="text-sm text-white/40">No tracks yet.</p>}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-white font-bold text-lg mb-3">Upcoming Shows</h2>
        <TourDatesList artistId={userId} />
      </section>

      <section className="mb-8">
        <h2 className="text-white font-bold text-lg mb-3">Merch</h2>
        <MerchGrid artistId={userId} />
      </section>

      {isOwner && (
        <section className="mb-8">
          <h2 className="text-white font-bold text-lg mb-3">Your Stats</h2>
          <ArtistStatsPanel artistId={userId} />
        </section>
      )}
    </div>
  );
}
