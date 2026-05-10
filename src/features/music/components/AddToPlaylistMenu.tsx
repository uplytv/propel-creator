import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserPlaylists } from '../hooks/useTrack';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

const sb = supabase as unknown as any;

export default function AddToPlaylistMenu({ trackId }: { trackId: string }) {
  const { user } = useAuth();
  const { data: playlists, refetch } = useUserPlaylists(user?.id);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!user) return null;

  const add = async (playlistId: string) => {
    setAdding(true);
    const { data: cur } = await sb
      .from('music_playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);
    const nextPos = (cur?.[0]?.position ?? -1) + 1;
    await sb.from('music_playlist_tracks').insert({
      playlist_id: playlistId,
      track_id: trackId,
      position: nextPos,
    });
    setAdding(false);
    setOpen(false);
  };

  const create = async () => {
    const title = prompt('Playlist name?');
    if (!title) return;
    const { data } = await sb
      .from('music_playlists')
      .insert({ user_id: user.id, title, is_public: false })
      .select('id')
      .single();
    if (data?.id) {
      await refetch();
      add(data.id);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/20 text-white hover:bg-white/5"
      >
        + Add to playlist
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#161616] border border-white/10 p-2 z-30">
          <button
            onClick={create}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:bg-white/5"
          >
            <Plus className="w-4 h-4" /> New playlist
          </button>
          {(playlists ?? []).map((p) => (
            <button
              key={p.id}
              disabled={adding}
              onClick={() => add(p.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/5 truncate"
            >
              {p.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
