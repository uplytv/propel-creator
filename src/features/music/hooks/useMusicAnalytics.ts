import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export interface OverviewRow {
  day: string;
  plays: number;
  unique_listeners: number;
  likes: number;
  purchases: number;
  revenue_cents: number;
}

export interface TopTrackRow {
  track_id: string;
  title: string;
  cover_art_url: string | null;
  plays: number;
  unique_listeners: number;
  likes: number;
  purchases: number;
  revenue_cents: number;
}

export interface TopFanRow {
  user_id: string;
  plays: number;
  likes: number;
  purchases: number;
  revenue_cents: number;
  score: number;
}

export function useMusicOverview(artistId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ['music', 'overview', artistId, days],
    enabled: !!artistId,
    queryFn: async (): Promise<OverviewRow[]> => {
      const { data, error } = await sb.rpc('music_creator_overview', { _artist_id: artistId, _days: days });
      if (error) throw error;
      return (data ?? []) as OverviewRow[];
    },
  });
}

export function useMusicTopTracks(artistId: string | undefined, days = 30, limit = 10) {
  return useQuery({
    queryKey: ['music', 'top-tracks', artistId, days, limit],
    enabled: !!artistId,
    queryFn: async (): Promise<TopTrackRow[]> => {
      const { data, error } = await sb.rpc('music_top_tracks', { _artist_id: artistId, _days: days, _limit: limit });
      if (error) throw error;
      return (data ?? []) as TopTrackRow[];
    },
  });
}

export function useMusicTopFans(artistId: string | undefined, days = 30, limit = 10) {
  return useQuery({
    queryKey: ['music', 'top-fans', artistId, days, limit],
    enabled: !!artistId,
    queryFn: async (): Promise<TopFanRow[]> => {
      const { data, error } = await sb.rpc('music_top_fans', { _artist_id: artistId, _days: days, _limit: limit });
      if (error) throw error;
      return (data ?? []) as TopFanRow[];
    },
  });
}
