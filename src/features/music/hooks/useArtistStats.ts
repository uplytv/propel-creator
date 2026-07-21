import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArtistStats {
  monthly_listeners: number;
  total_plays: number;
  top_countries: { country: string; listeners: number }[];
  top_cities: { city: string; listeners: number }[];
}

export function useArtistStats(artistId?: string, days = 30) {
  return useQuery({
    queryKey: ["artist-stats", artistId, days],
    queryFn: async (): Promise<ArtistStats> => {
      if (!artistId) {
        return { monthly_listeners: 0, total_plays: 0, top_countries: [], top_cities: [] };
      }
      const { data, error } = await supabase.rpc("get_artist_listener_stats", {
        _artist_id: artistId,
        _days: days,
      });
      if (error) throw error;
      return (data as unknown as ArtistStats) ?? { monthly_listeners: 0, total_plays: 0, top_countries: [], top_cities: [] };
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });
}
