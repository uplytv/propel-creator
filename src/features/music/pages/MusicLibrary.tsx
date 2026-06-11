import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TrackRow from '../components/TrackRow';
import SmartPlaylistsPanel from '../components/SmartPlaylistsPanel';
import FoldersPanel from '../components/FoldersPanel';
import { useDownloadedTracks } from '../hooks/useDownloads';
import type { Track } from '../types';
import { DownloadCloud, Heart, Sparkles, FolderOpen, Upload } from 'lucide-react';

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
        .order('created_at', { ascending: false })
        .limit(20);
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

  const { data: downloads } = useDownloadedTracks();

  if (loading) return null;
  if (!user) return <Navigate to="/auth?returnTo=/music/library" replace />;

  return (
    <div className="pb-40 max-w-4xl mx-auto px-4 pt-4 space-y-8">
      <h1 className="text-2xl font-black text-white">Your library</h1>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <DownloadCloud className="w-4 h-4" style={{ color: '#3D7CFF' }} />
          <h2 className="text-lg font-bold text-white">Downloaded</h2>
          <span className="text-white/40 text-xs">{downloads?.length ?? 0}</span>
        </div>
        <div className="space-y-1">
          {(downloads ?? []).map((t, i) => (
            <TrackRow key={t.id} track={t} queue={downloads} index={i} />
          ))}
          {!downloads?.length && (
            <p className="text-sm text-white/40">Tap the download icon on any track to save it for offline.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: '#3D7CFF' }} />
          <h2 className="text-lg font-bold text-white">Smart playlists</h2>
        </div>
        <SmartPlaylistsPanel />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4" style={{ color: '#FF4D6D' }} />
          <h2 className="text-lg font-bold text-white">Recently liked</h2>
        </div>
        <div className="space-y-1">
          {(liked ?? []).map((t, i) => (
            <TrackRow key={t.id} track={t} queue={liked} index={i} />
          ))}
          {!liked?.length && <p className="text-sm text-white/40">No likes yet.</p>}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-white/70" />
          <h2 className="text-lg font-bold text-white">Folders & playlists</h2>
        </div>
        <FoldersPanel />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-white/70" />
          <h2 className="text-lg font-bold text-white">Your uploads</h2>
        </div>
        <div className="space-y-1">
          {(mine ?? []).map((t, i) => (
            <TrackRow key={t.id} track={t} queue={mine} index={i} />
          ))}
          {!mine?.length && (
            <p className="text-sm text-white/40">Nothing yet — head to /music/upload.</p>
          )}
        </div>
      </section>
    </div>
  );
}
