import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { usePlayerStore } from './usePlayerStore';
import type { Track } from '../types';

const sb = supabase as unknown as any;

/** Logs a 'recently played' row when a track starts (debounced per track-session). */
export function useRecentlyPlayedLogger() {
  const { user } = useAuth();
  const currentIdx = usePlayerStore((s) => s.currentIndex);
  const queue = usePlayerStore((s) => s.queue);
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || currentIdx < 0) return;
    const t = queue[currentIdx];
    if (!t || lastLoggedRef.current === t.id) return;
    lastLoggedRef.current = t.id;
    sb.from('music_recently_played')
      .insert({ user_id: user.id, track_id: t.id, position_seconds: 0 })
      .then(() => {});
  }, [currentIdx, queue, user]);
}

export function useRecentlyPlayed(limit = 12) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'recently-played', user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<Track[]> => {
      const { data, error } = await sb
        .from('music_recently_played')
        .select('track_id, played_at, track:tracks(*)')
        .eq('user_id', user!.id)
        .order('played_at', { ascending: false })
        .limit(limit * 3); // overfetch so we can dedupe
      if (error) throw error;
      const seen = new Set<string>();
      const tracks: Track[] = [];
      for (const row of data || []) {
        const t = (row as any).track as Track | null;
        if (!t || seen.has(t.id)) continue;
        seen.add(t.id);
        tracks.push(t);
        if (tracks.length >= limit) break;
      }
      return tracks;
    },
  });
}
