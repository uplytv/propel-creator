import { useState, useMemo } from 'react';
import { GripVertical, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useArtistProfile } from '../hooks/useArtistProfile';
import { useUpdateSpotlight, SPOTLIGHT_LIMIT } from '../hooks/useArtistSpotlight';

const sb = supabase as unknown as any;

export default function ArtistSpotlightEditor({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { data: profile } = useArtistProfile(userId);
  const update = useUpdateSpotlight();
  const isOwner = user?.id === userId;

  const ids: string[] = (profile as any)?.spotlight_track_ids ?? [];

  const { data: tracks = [] } = useQuery({
    queryKey: ['music', 'creator-tracks', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb
        .from('tracks')
        .select('id,title,cover_art_url')
        .eq('creator_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data ?? []) as { id: string; title: string; cover_art_url: string | null }[];
    },
  });

  const trackMap = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t])), [tracks]);
  const [draftIds, setDraftIds] = useState<string[]>(ids);

  // sync state if remote changes
  useMemo(() => setDraftIds(ids), [ids.join(',')]);

  if (!isOwner) {
    if (!ids.length) return null;
    return (
      <section className="mt-6">
        <h2 className="text-base font-bold text-white mb-3">Spotlight</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ids.map((id) => {
            const t = trackMap[id];
            if (!t) return null;
            return (
              <a
                key={id}
                href={`/music/track/${id}`}
                className="block rounded-lg overflow-hidden bg-white/5"
              >
                <div
                  className="aspect-square"
                  style={{
                    background: t.cover_art_url
                      ? `url(${t.cover_art_url}) center/cover`
                      : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
                  }}
                />
                <div className="p-2 text-xs text-white truncate">{t.title}</div>
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  const move = (from: number, to: number) => {
    const next = draftIds.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setDraftIds(next);
  };
  const remove = (id: string) => setDraftIds(draftIds.filter((x) => x !== id));
  const add = (id: string) => {
    if (draftIds.includes(id) || draftIds.length >= SPOTLIGHT_LIMIT) return;
    setDraftIds([...draftIds, id]);
  };
  const save = () => {
    update.mutate(draftIds, {
      onSuccess: () => toast.success('Spotlight saved'),
      onError: (e: any) => toast.error(e?.message || 'Could not save'),
    });
  };

  const available = tracks.filter((t) => !draftIds.includes(t.id));

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">
          Spotlight ({draftIds.length}/{SPOTLIGHT_LIMIT})
        </h2>
        <button
          onClick={save}
          disabled={update.isPending}
          className="px-3 py-1.5 rounded-full bg-[#3D7CFF] text-black text-xs font-bold disabled:opacity-50"
          style={{ minHeight: 36 }}
        >
          Save
        </button>
      </div>
      <ul className="space-y-2">
        {draftIds.map((id, i) => {
          const t = trackMap[id];
          if (!t) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-2 bg-white/5 rounded-lg p-2"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = Number(e.dataTransfer.getData('text/plain'));
                move(from, i);
              }}
            >
              <GripVertical className="w-4 h-4 text-white/40" />
              <div
                className="w-10 h-10 rounded"
                style={{
                  background: t.cover_art_url
                    ? `url(${t.cover_art_url}) center/cover`
                    : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
                }}
              />
              <div className="flex-1 text-sm text-white truncate">{t.title}</div>
              <button onClick={() => remove(id)} className="p-2 text-white/50 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {available.length > 0 && draftIds.length < SPOTLIGHT_LIMIT && (
        <div className="mt-3">
          <div className="text-xs text-white/50 mb-2">Add a track:</div>
          <div className="flex flex-wrap gap-2">
            {available.slice(0, 12).map((t) => (
              <button
                key={t.id}
                onClick={() => add(t.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white"
                style={{ minHeight: 32 }}
              >
                <Plus className="w-3 h-3" /> {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
