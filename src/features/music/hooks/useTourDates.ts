import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface TourDate {
  id: string;
  artist_id: string;
  venue_name: string;
  city: string;
  country: string | null;
  event_date: string;
  ticket_url: string | null;
  is_sold_out: boolean;
}

export function useTourDates(artistId?: string) {
  return useQuery({
    queryKey: ["tour-dates", artistId],
    queryFn: async () => {
      if (!artistId) return [] as TourDate[];
      const { data } = await supabase
        .from("artist_tour_dates")
        .select("*")
        .eq("artist_id", artistId)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      return (data as TourDate[]) ?? [];
    },
    enabled: !!artistId,
  });
}

export function useAddTourDate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TourDate, "id" | "artist_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("artist_tour_dates")
        .insert({ ...payload, artist_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tour-dates", user?.id] }),
  });
}

export function useDeleteTourDate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_tour_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tour-dates", user?.id] }),
  });
}
