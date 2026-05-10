import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TourDate {
  id: string;
  artist_id: string;
  tour_name: string | null;
  venue_name: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  doors_at: string | null;
  on_sale_at: string | null;
  ticket_url: string | null;
  status: string;
  cover_url: string | null;
  notes: string | null;
}

export interface NearbyTourDate {
  id: string;
  artist_id: string;
  tour_name: string | null;
  venue_name: string;
  city: string;
  country: string;
  starts_at: string;
  ticket_url: string | null;
  cover_url: string | null;
  distance_km: number;
}

export function useArtistTourDates(artistId: string | undefined) {
  return useQuery({
    queryKey: ["tour-dates", artistId],
    enabled: !!artistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tour_dates")
        .select("*")
        .eq("artist_id", artistId!)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TourDate[];
    },
  });
}

export function useUpcomingTourDates(limit = 30) {
  return useQuery({
    queryKey: ["tour-dates-upcoming", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tour_dates")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TourDate[];
    },
  });
}

export function useNearbyTourDates(coords: { lat: number; lng: number } | null, radiusKm = 100) {
  return useQuery({
    queryKey: ["tour-dates-nearby", coords, radiusKm],
    enabled: !!coords,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nearby_tour_dates", {
        _lat: coords!.lat,
        _lng: coords!.lng,
        _radius_km: radiusKm,
        _limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as NearbyTourDate[];
    },
  });
}

export function useMyRsvps() {
  return useQuery({
    queryKey: ["my-tour-rsvps"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("music_tour_rsvps")
        .select("*, music_tour_dates(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTourRsvp(tourDateId: string | undefined) {
  return useQuery({
    queryKey: ["tour-rsvp", tourDateId],
    enabled: !!tourDateId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("music_tour_rsvps")
        .select("*")
        .eq("tour_date_id", tourDateId!)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });
}

export function useSetTourRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tour_date_id: string; status: "going" | "interested" | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      if (input.status === null) {
        await supabase.from("music_tour_rsvps").delete()
          .eq("tour_date_id", input.tour_date_id)
          .eq("user_id", user.id);
        return;
      }
      await supabase.from("music_tour_rsvps").upsert({
        tour_date_id: input.tour_date_id,
        user_id: user.id,
        status: input.status,
      }, { onConflict: "tour_date_id,user_id" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tour-rsvp", vars.tour_date_id] });
      qc.invalidateQueries({ queryKey: ["my-tour-rsvps"] });
    },
  });
}

export function useArtistAlert(artistId: string | undefined) {
  return useQuery({
    queryKey: ["artist-alert", artistId],
    enabled: !!artistId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("music_artist_alerts")
        .select("*")
        .eq("artist_id", artistId!)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });
}

export function useToggleArtistAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { artist_id: string; enable: boolean; city?: string; country?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      if (!input.enable) {
        await supabase.from("music_artist_alerts").delete()
          .eq("artist_id", input.artist_id)
          .eq("user_id", user.id);
        return;
      }
      await supabase.from("music_artist_alerts").upsert({
        artist_id: input.artist_id,
        user_id: user.id,
        city: input.city ?? null,
        country: input.country ?? null,
      }, { onConflict: "artist_id,user_id" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["artist-alert", vars.artist_id] });
    },
  });
}
