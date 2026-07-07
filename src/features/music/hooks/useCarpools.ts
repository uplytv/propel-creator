import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CarpoolStatus = "open" | "full" | "closed" | "cancelled";
export type RiderStatus = "requested" | "confirmed" | "declined" | "cancelled";

export interface Carpool {
  id: string;
  driver_id: string;
  concert_label: string;
  concert_date: string | null;
  origin_city: string;
  meeting_point: string | null;
  departure_time: string | null;
  total_seats: number;
  seats_taken: number;
  contact_note: string | null;
  status: CarpoolStatus;
  created_at: string;
  updated_at: string;
}

export interface CarpoolRider {
  id: string;
  carpool_id: string;
  rider_id: string;
  status: RiderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useCarpools(concertLabel?: string) {
  return useQuery({
    queryKey: ["music-carpools", concertLabel],
    staleTime: 30_000,
    queryFn: async (): Promise<Carpool[]> => {
      let q = supabase
        .from("music_concert_carpools")
        .select("*")
        .order("departure_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (concertLabel) q = q.eq("concert_label", concertLabel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Carpool[];
    },
  });
}

export function useCarpoolRiders(carpoolId?: string) {
  return useQuery({
    queryKey: ["music-carpool-riders", carpoolId],
    enabled: !!carpoolId,
    staleTime: 15_000,
    queryFn: async (): Promise<CarpoolRider[]> => {
      const { data, error } = await supabase
        .from("music_carpool_riders")
        .select("*")
        .eq("carpool_id", carpoolId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CarpoolRider[];
    },
  });
}

export function useCreateCarpool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      concert_label: string;
      origin_city: string;
      concert_date?: string | null;
      meeting_point?: string | null;
      departure_time?: string | null;
      total_seats?: number;
      contact_note?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_concert_carpools")
        .insert({
          driver_id: u.user.id,
          concert_label: input.concert_label,
          origin_city: input.origin_city,
          concert_date: input.concert_date ?? null,
          meeting_point: input.meeting_point ?? null,
          departure_time: input.departure_time ?? null,
          total_seats: input.total_seats ?? 4,
          contact_note: input.contact_note ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Carpool;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-carpools"] });
      qc.invalidateQueries({ queryKey: ["music-carpools", row.concert_label] });
    },
  });
}

export function useJoinCarpool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { carpool_id: string; note?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_carpool_riders")
        .insert({
          carpool_id: input.carpool_id,
          rider_id: u.user.id,
          note: input.note ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CarpoolRider;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-carpool-riders", row.carpool_id] });
      qc.invalidateQueries({ queryKey: ["music-carpools"] });
    },
  });
}

export function useUpdateRiderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; carpool_id: string; status: RiderStatus }) => {
      const { error } = await supabase
        .from("music_carpool_riders")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-carpool-riders", input.carpool_id] });
      qc.invalidateQueries({ queryKey: ["music-carpools"] });
    },
  });
}
