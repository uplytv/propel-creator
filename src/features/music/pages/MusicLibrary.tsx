import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserPlaylists } from '../hooks/useTrack';
import TrackRow from '../components/TrackRow';
import PlaylistCard from '../components/PlaylistCard';
import type { Track } from '../types';

const sb = supabase as unknown as any;

export default function MusicLibrary() {
  const { user, loading } = useAuth();

  const { data: liked } = useQuery({
    queryKey: ['music', 'liked', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from('track_likes')
        .select('track_id, tracks(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return ((data as any[]) ?? []).map((r) => r.tracks as Track).filter(Boolean);
    },
  });

  const { data: mine } = useQuery({
    queryKey: ['music', 'mine', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from('tracks')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      return (data as Track[]) ?? [];
    },
  });

  const { data: playlists } = useUserPlaylists(user?.id);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?returnTo=/music/library" replace />;

  return (
    <div className="pb-40 max-w-4xl mx-auto px-4 pt-4 space-y-8">
      <h1 className="text-2xl font-black text-white">Your library</h1>

      <section>
        <h2 className="text-lg font-bold text-white mb-3">Your uploads</h2>
        <div className="space-y-1">
          {(mine ?? []).map((t, i) => (
            <TrackRow key={t.id} track={t} queue={mine} index={i} />
          ))}
          {!mine?.length && (
            <p className="text-sm text-white/40">Nothing yet — head to /music/upload.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-3">Liked tracks</h2>
        <div className="space-y-1">
          {(liked ?? []).map((t, i) => (
            <TrackRow key={t.id} track={t} queue={liked} index={i} />
          ))}
          {!liked?.length && <p className="text-sm text-white/40">No likes yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-3">Your playlists</h2>
        <div className="flex flex-wrap gap-3">
          {(playlists ?? []).map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
          {!playlists?.length && <p className="text-sm text-white/40">No playlists yet.</p>}
        </div>
      </section>
    </div>
  );
}
