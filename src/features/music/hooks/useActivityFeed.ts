import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;
const PAGE = 20;

export interface FeedEvent {
  id: string;
  actor_id: string;
  event_type: string;
  target_track_id: string | null;
  target_album_id: string | null;
  target_playlist_id: string | null;
  metadata: any;
  created_at: string;
  actor?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
  track?: any;
}

export function useActivityFeed(scope: 'following' | 'global' = 'following') {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['music', 'feed', scope, user?.id],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let actorIds: string[] | null = null;
      if (scope === 'following' && user) {
        const { data: follows } = await sb
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        actorIds = (follows ?? []).map((f: any) => f.following_id);
        if (!actorIds.length) return { items: [] as FeedEvent[], nextCursor: null };
      }

      let q = sb
        .from('activity_feed_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE);
      if (actorIds) q = q.in('actor_id', actorIds);
      if (pageParam) q = q.lt('created_at', pageParam);

      const { data: events, error } = await q;
      if (error) throw error;
      const evs = (events ?? []) as FeedEvent[];

      // Hydrate actors and tracks
      const actorIdsAll = Array.from(new Set(evs.map((e) => e.actor_id)));
      const trackIds = Array.from(new Set(evs.map((e) => e.target_track_id).filter(Boolean) as string[]));
      const [{ data: profs }, { data: tracks }] = await Promise.all([
        actorIdsAll.length
          ? sb.from('profiles').select('id,username,display_name,avatar_url').in('id', actorIdsAll)
          : Promise.resolve({ data: [] }),
        trackIds.length
          ? sb.from('tracks').select('*').in('id', trackIds)
          : Promise.resolve({ data: [] }),
      ]);
      const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      const trackMap = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t]));
      const items = evs.map((e) => ({
        ...e,
        actor: profMap[e.actor_id] ?? null,
        track: e.target_track_id ? trackMap[e.target_track_id] ?? null : null,
      }));
      const nextCursor = items.length === PAGE ? items[items.length - 1].created_at : null;
      return { items, nextCursor };
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}
