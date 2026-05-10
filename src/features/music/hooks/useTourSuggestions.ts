import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TourSuggestionStatus = "open" | "reviewing" | "closed";

export interface TourSuggestion {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  status: TourSuggestionStatus;
  suggestion_count: number;
  created_at: string;
  updated_at: string;
}

export interface TourSuggestionCity {
  id: string;
  suggestion_id: string;
  city: string;
  region: string | null;
  country: string | null;
  notes: string | null;
  vote_count: number;
  suggested_by: string | null;
  created_at: string;
}

export interface TourSuggestionVote {
  id: string;
  suggestion_id: string;
  city_id: string;
  fan_id: string;
}

export function useTourSuggestions(artistId?: string) {
  return useQuery({
    queryKey: ["music_tour_suggestions", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tour_suggestions" as any)
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TourSuggestion[];
    },
  });
}

export function useTourSuggestion(id?: string) {
  return useQuery({
    queryKey: ["music_tour_suggestion", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tour_suggestions" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TourSuggestion | null;
    },
  });
}

export function useTourSuggestionCities(suggestionId?: string) {
  return useQuery({
    queryKey: ["music_tour_suggestion_cities", suggestionId],
    enabled: !!suggestionId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tour_suggestion_cities" as any)
        .select("*")
        .eq("suggestion_id", suggestionId!)
        .order("vote_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TourSuggestionCity[];
    },
  });
}

export function useMyTourVotes(suggestionId?: string) {
  return useQuery({
    queryKey: ["music_tour_my_votes", suggestionId],
    enabled: !!suggestionId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as TourSuggestionVote[];
      const { data, error } = await supabase
        .from("music_tour_suggestion_votes" as any)
        .select("*")
        .eq("suggestion_id", suggestionId!)
        .eq("fan_id", u.user.id);
      if (error) throw error;
      return (data ?? []) as unknown as TourSuggestionVote[];
    },
  });
}

export function useCreateTourSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_tour_suggestions" as any)
        .insert({ ...input, artist_id: u.user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TourSuggestion;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["music_tour_suggestions", d.artist_id] });
    },
  });
}

export function useAddTourCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { suggestionId: string; city: string; region?: string; country?: string; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_tour_suggestion_cities" as any)
        .insert({
          suggestion_id: input.suggestionId,
          city: input.city,
          region: input.region,
          country: input.country,
          notes: input.notes,
          suggested_by: u.user.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_tour_suggestion_cities", vars.suggestionId] });
      qc.invalidateQueries({ queryKey: ["music_tour_suggestion", vars.suggestionId] });
    },
  });
}

export function useCastTourVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ suggestionId, cityId }: { suggestionId: string; cityId: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_tour_suggestion_votes" as any)
        .insert({ suggestion_id: suggestionId, city_id: cityId, fan_id: u.user.id } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_tour_suggestion_cities", vars.suggestionId] });
      qc.invalidateQueries({ queryKey: ["music_tour_my_votes", vars.suggestionId] });
    },
  });
}

export function useRemoveTourVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ suggestionId, cityId }: { suggestionId: string; cityId: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_tour_suggestion_votes" as any)
        .delete()
        .eq("city_id", cityId)
        .eq("fan_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_tour_suggestion_cities", vars.suggestionId] });
      qc.invalidateQueries({ queryKey: ["music_tour_my_votes", vars.suggestionId] });
    },
  });
}
