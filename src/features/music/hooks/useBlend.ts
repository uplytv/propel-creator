import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Track } from '../types';

const sb = supabase as unknown as any;

export interface BlendResult {
  partner: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  tracks: Track[];
  sharedCount: number;
}

export function useBlend(partnerUserId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'blend', user?.id, partnerUserId],
    enabled: !!user && !!partnerUserId && user!.id !== partnerUserId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<BlendResult | null> => {
      const { data: rows, error } = await sb.rpc('get_music_blend', {
        _user_a: user!.id,
        _user_b: partnerUserId!,
        _limit: 30,
      });
      if (error) throw error;
      const ids = (rows ?? []).map((r: any) => r.track_id);
      if (!ids.length) return null;
      const { data: trackRows } = await sb
        .from('tracks')
        .select('*')
        .in('id', ids)
        .eq('is_published', true);
      const byId = new Map((trackRows ?? []).map((t: any) => [t.id, t as Track]));
      const tracks = (rows ?? [])
        .map((r: any) => byId.get(r.track_id))
        .filter(Boolean) as Track[];
      const sharedCount = (rows ?? []).filter((r: any) => r.source === 'shared').length;

      const { data: prof } = await sb
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .eq('user_id', partnerUserId!)
        .maybeSingle();

      return {
        partner: {
          id: partnerUserId!,
          displayName: prof?.display_name ?? null,
          username: prof?.username ?? null,
          avatarUrl: prof?.avatar_url ?? null,
        },
        tracks,
        sharedCount,
      };
    },
  });
}
