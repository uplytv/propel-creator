import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchCreatorTracks } from '../lib/musicQueries';
import TrackRow from '../components/TrackRow';
import { ArrowLeft } from 'lucide-react';

const sb = supabase as unknown as any;

export default function ProfileMusicTab() {
  const { username } = useParams<{ username: string }>();

  const { data: profile } = useQuery({
    queryKey: ['music', 'profile-by-username', username],
    queryFn: async () => {
      const { data } = await sb
        .from('profiles')
        .select('user_id, display_name, username')
        .eq('username', username)
        .maybeSingle();
      return data;
    },
    enabled: !!username,
  });

  const { data: tracks } = useQuery({
    queryKey: ['music', 'profile-tracks', profile?.user_id],
    queryFn: () => fetchCreatorTracks(profile!.user_id),
    enabled: !!profile?.user_id,
  });

  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
      <Link to={`/${username}`} className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> {username}
      </Link>
      <h1 className="text-2xl font-black text-white mb-4">
        {profile?.display_name || username}'s music
      </h1>
      <div className="space-y-1">
        {(tracks ?? []).map((t, i) => (
          <TrackRow key={t.id} track={t} queue={tracks} index={i} />
        ))}
        {!tracks?.length && <p className="text-sm text-white/40">No tracks yet.</p>}
      </div>
    </div>
  );
}
