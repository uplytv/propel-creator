import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TourCityStatus = "open" | "considering" | "booked" | "declined";

export interface TourCityRequest {
  id: string;
  artist_id: string;
  nominator_id: string;
  city: string;
  region: string | null;
  country: string;
  vote_count: number;
  status: TourCityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTourCityRequests(artistId?: string) {
  return useQuery({
    queryKey: ["music_tour_city_requests", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tour_city_requests")
        .select("*")
        .eq("artist_id", artistId!)
        .order("vote_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TourCityRequest[];
    },
  });
}

export function useMyTourCityVotes(artistId?: string) {
  return useQuery({
    queryKey: ["music_tour_city_votes", "mine", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return new Set<string>();
      const { data: reqs, error: rErr } = await supabase
        .from("music_tour_city_requests")
        .select("id")
        .eq("artist_id", artistId!);
      if (rErr) throw rErr;
      const ids = (reqs ?? []).map((r) => r.id);
      if (!ids.length) return new Set<string>();
      const { data, error } = await supabase
        .from("music_tour_city_votes")
        .select("request_id")
        .eq("fan_id", uid)
        .in("request_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((v) => v.request_id));
    },
  });
}

export function useNominateTourCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      city: string;
      country: string;
      region?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in to nominate");
      const { data, error } = await supabase
        .from("music_tour_city_requests")
        .insert({
          artist_id: input.artist_id,
          nominator_id: uid,
          city: input.city,
          country: input.country,
          region: input.region ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TourCityRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music_tour_city_requests"] });
    },
  });
}

export function useToggleTourCityVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { request_id: string; voted: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in to vote");
      if (input.voted) {
        const { error } = await supabase
          .from("music_tour_city_votes")
          .delete()
          .eq("request_id", input.request_id)
          .eq("fan_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("music_tour_city_votes")
          .insert({ request_id: input.request_id, fan_id: uid });
        if (error) throw error;
      }
      return input.request_id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music_tour_city_requests"] });
      qc.invalidateQueries({ queryKey: ["music_tour_city_votes"] });
    },
  });
}
