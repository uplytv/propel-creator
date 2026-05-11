import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export interface TrackComment {
  id: string;
  track_id: string;
  user_id: string;
  parent_id: string | null;
  timestamp_seconds: number | null;
  content: string;
  like_count: number;
  created_at: string;
  profile: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

export function useTrackComments(trackId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['music', 'track-comments', trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('track_comments')
        .select('id,track_id,user_id,parent_id,timestamp_seconds,content,like_count,created_at')
        .eq('track_id', trackId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((c: any) => c.user_id)));
      let profiles: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await sb
          .from('profiles')
          .select('id,username,display_name,avatar_url')
          .in('id', ids);
        profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return (data ?? []).map((c: any) => ({ ...c, profile: profiles[c.user_id] ?? null })) as TrackComment[];
    },
  });

  useEffect(() => {
    if (!trackId) return;
    const channel = supabase
      .channel(`track-comments-${trackId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'track_comments', filter: `track_id=eq.${trackId}` },
        () => qc.invalidateQueries({ queryKey: ['music', 'track-comments', trackId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackId, qc]);

  return query;
}
