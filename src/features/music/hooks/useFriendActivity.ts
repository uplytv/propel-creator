import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Track } from '../types';

const sb = supabase as unknown as any;

export type FriendActivityType = 'liked' | 'reposted' | 'played';

export interface FriendActivity {
  type: FriendActivityType;
  occurredAt: string;
  actor: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  track: Track;
}

export function useFriendActivity(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'friend-activity', user?.id, limit],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<FriendActivity[]> => {
      const { data, error } = await sb.rpc('get_friend_music_activity', {
        _viewer: user!.id,
        _limit: limit,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        type: r.activity_type,
        occurredAt: r.occurred_at,
        actor: {
          id: r.actor_id,
          displayName: r.actor_display_name,
          username: r.actor_username,
          avatarUrl: r.actor_avatar_url,
        },
        track: {
          id: r.track_id,
          creator_id: r.track_creator_id,
          title: r.track_title,
          description: null,
          genre: r.track_genre,
          cover_art_url: r.track_cover_art_url,
          audio_mux_asset_id: null,
          audio_mux_playback_id: r.track_mux_playback_id,
          audio_upload_id: null,
          audio_status: r.track_audio_status,
          duration_seconds: r.track_duration_seconds,
          is_published: true,
          is_explicit: false,
          monetization_type: 'free',
          play_count: 0,
          like_count: 0,
          release_date: null,
          created_at: r.occurred_at,
          updated_at: r.occurred_at,
        } as Track,
      }));
    },
  });
}
