import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VinylDropStatus = "draft" | "announced" | "preorder" | "shipped" | "soldout";
export type VinylReservationStatus = "pending" | "confirmed" | "canceled";

export interface VinylDrop {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  color: string | null;
  edition_size: number;
  price_cents: number;
  currency: string;
  cover_url: string | null;
  status: VinylDropStatus;
  reserved_count: number;
  ships_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VinylReservation {
  id: string;
  drop_id: string;
  fan_id: string;
  quantity: number;
  status: VinylReservationStatus;
  created_at: string;
  updated_at: string;
}

export function useVinylDrops(artistId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["music_vinyl_drops", artistId, !!opts?.includeDrafts],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("music_vinyl_drops")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (!opts?.includeDrafts) q = q.neq("status", "draft");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VinylDrop[];
    },
  });
}

export function useVinylDrop(id?: string) {
  return useQuery({
    queryKey: ["music_vinyl_drop", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("music_vinyl_drops")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as VinylDrop | null;
    },
  });
}

export function useMyVinylReservation(dropId?: string) {
  return useQuery({
    queryKey: ["music_vinyl_reservation", dropId],
    enabled: !!dropId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data, error } = await (supabase as any)
        .from("music_vinyl_reservations")
        .select("*")
        .eq("drop_id", dropId)
        .eq("fan_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as VinylReservation | null;
    },
  });
}

export function useReserveVinyl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dropId, quantity = 1 }: { dropId: string; quantity?: number }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_vinyl_reservations")
        .upsert(
          { drop_id: dropId, fan_id: uid, quantity, status: "pending" },
          { onConflict: "drop_id,fan_id" }
        )
        .select("*")
        .single();
      if (error) throw error;
      return data as VinylReservation;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["music_vinyl_reservation", r.drop_id] });
      qc.invalidateQueries({ queryKey: ["music_vinyl_drop", r.drop_id] });
      qc.invalidateQueries({ queryKey: ["music_vinyl_drops"] });
    },
  });
}

export function useCancelVinylReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dropId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("music_vinyl_reservations")
        .update({ status: "canceled" })
        .eq("drop_id", dropId)
        .eq("fan_id", uid);
      if (error) throw error;
      return dropId;
    },
    onSuccess: (dropId) => {
      qc.invalidateQueries({ queryKey: ["music_vinyl_reservation", dropId] });
      qc.invalidateQueries({ queryKey: ["music_vinyl_drop", dropId] });
      qc.invalidateQueries({ queryKey: ["music_vinyl_drops"] });
    },
  });
}
