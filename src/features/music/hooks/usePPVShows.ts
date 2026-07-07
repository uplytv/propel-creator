import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface PPVShow {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  scheduled_start: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  stream_url: string | null;
  status: "scheduled" | "live" | "ended" | "canceled";
  created_at: string;
}

export interface PPVTicket {
  id: string;
  show_id: string;
  fan_id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "refunded";
  created_at: string;
}

export function usePPVShows(artistId?: string) {
  return useQuery({
    queryKey: ["ppv-shows", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_ppv_shows").select("*").order("scheduled_start", { ascending: true });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PPVShow[];
    },
    staleTime: 30_000,
  });
}

export function usePPVShow(id?: string) {
  return useQuery({
    queryKey: ["ppv-show", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_ppv_shows")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as PPVShow | null;
    },
  });
}

export function useMyPPVTicket(showId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ppv-ticket", showId, user?.id],
    enabled: !!showId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_ppv_tickets")
        .select("*")
        .eq("show_id", showId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as PPVTicket | null;
    },
  });
}

export function usePurchasePPVTicket() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { show_id: string; amount_cents: number; currency?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_ppv_tickets")
        .insert({
          show_id: input.show_id,
          fan_id: user.id,
          amount_cents: input.amount_cents,
          currency: input.currency ?? "USD",
          status: "paid",
        })
        .select()
        .single();
      if (error) throw error;
      return data as PPVTicket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ppv-ticket", vars.show_id] });
    },
  });
}
