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

// ===== Legacy per-track analytics (preserved) =====

export interface ListenerTrend {
  day: string;
  plays: number;
  unique_listeners: number;
}

export function useTrackListenerTrends(trackId?: string, days = 30) {
  return useQuery({
    queryKey: ["track-listener-trends", trackId, days],
    queryFn: async (): Promise<ListenerTrend[]> => {
      if (!trackId) return [];
      const { data, error } = await sb.rpc("get_track_listener_trends", { _track_id: trackId, _days: days });
      if (error) throw error;
      return (data ?? []) as ListenerTrend[];
    },
    enabled: !!trackId,
    staleTime: 60_000,
  });
}

export interface GeoBreakdown {
  countries: { country: string; listeners: number }[];
  cities: { city: string; listeners: number }[];
}

export function useTrackGeoBreakdown(trackId?: string, days = 30) {
  return useQuery({
    queryKey: ["track-geo-breakdown", trackId, days],
    queryFn: async (): Promise<GeoBreakdown> => {
      if (!trackId) return { countries: [], cities: [] };
      const { data, error } = await sb.rpc("get_track_geo_breakdown", { _track_id: trackId, _days: days });
      if (error) throw error;
      return (data as GeoBreakdown) ?? { countries: [], cities: [] };
    },
    enabled: !!trackId,
    staleTime: 60_000,
  });
}

export interface RevenueDay {
  day: string;
  sales_revenue: number;
  tips_revenue: number;
  total_revenue: number;
}

export function useCreatorMusicRevenue(artistId?: string, days = 30) {
  return useQuery({
    queryKey: ["creator-music-revenue", artistId, days],
    queryFn: async (): Promise<RevenueDay[]> => {
      if (!artistId) return [];
      const { data, error } = await sb.rpc("get_creator_music_revenue", { _artist_id: artistId, _days: days });
      if (error) throw error;
      return (data ?? []) as RevenueDay[];
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });
}
