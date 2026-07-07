import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DropStatus = "draft" | "scheduled" | "live" | "sold_out" | "ended" | "cancelled";

export interface MerchDrop {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  stock_total: number;
  stock_remaining: number;
  launch_at: string;
  ends_at: string | null;
  status: DropStatus;
  reservation_count: number;
  created_at: string;
  updated_at: string;
}

export interface MerchReservation {
  id: string;
  drop_id: string;
  fan_id: string;
  quantity: number;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
}

export function useMerchDrops(artistId?: string) {
  return useQuery({
    queryKey: ["music-merch-drops", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<MerchDrop[]> => {
      const { data, error } = await supabase
        .from("music_merch_drops")
        .select("*")
        .eq("artist_id", artistId)
        .order("launch_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MerchDrop[];
    },
  });
}

export function useMerchDrop(id?: string) {
  return useQuery({
    queryKey: ["music-merch-drop", id],
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async (): Promise<MerchDrop | null> => {
      const { data, error } = await supabase
        .from("music_merch_drops")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as MerchDrop | null;
    },
  });
}

export function useMyMerchReservation(dropId?: string) {
  return useQuery({
    queryKey: ["music-my-merch-reservation", dropId],
    enabled: !!dropId,
    staleTime: 15_000,
    queryFn: async (): Promise<MerchReservation | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("music_merch_reservations")
        .select("*")
        .eq("drop_id", dropId)
        .eq("fan_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as MerchReservation | null;
    },
  });
}

export function useReserveMerchDrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { drop_id: string; quantity?: number }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_merch_reservations")
        .insert({
          drop_id: input.drop_id,
          fan_id: u.user.id,
          quantity: Math.max(1, input.quantity ?? 1),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as MerchReservation;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-my-merch-reservation", row.drop_id] });
      qc.invalidateQueries({ queryKey: ["music-merch-drop", row.drop_id] });
      qc.invalidateQueries({ queryKey: ["music-merch-drops"] });
    },
  });
}

export function useCancelMerchReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("music_merch_reservations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-my-merch-reservation"] });
      qc.invalidateQueries({ queryKey: ["music-merch-drop"] });
      qc.invalidateQueries({ queryKey: ["music-merch-drops"] });
    },
  });
}
