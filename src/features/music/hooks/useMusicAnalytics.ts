import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await (supabase as any).rpc("get_track_listener_trends", {
        _track_id: trackId,
        _days: days,
      });
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
      const { data, error } = await (supabase as any).rpc("get_track_geo_breakdown", {
        _track_id: trackId,
        _days: days,
      });
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
      const { data, error } = await (supabase as any).rpc("get_creator_music_revenue", {
        _artist_id: artistId,
        _days: days,
      });
      if (error) throw error;
      return (data ?? []) as RevenueDay[];
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });
}
