import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Concert {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string | null;
  ticket_price_cents: number;
  currency: string;
  stream_url: string | null;
  status: string;
  max_capacity: number | null;
}

export function useUpcomingConcerts(limit = 20) {
  return useQuery({
    queryKey: ["music-concerts", "upcoming", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_concerts")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Concert[];
    },
  });
}

export function useConcert(concertId?: string) {
  return useQuery({
    queryKey: ["music-concert", concertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_concerts")
        .select("*")
        .eq("id", concertId!)
        .maybeSingle();
      if (error) throw error;
      return data as Concert | null;
    },
    enabled: !!concertId,
  });
}

export function useArtistConcerts(artistId?: string) {
  return useQuery({
    queryKey: ["music-concerts", "artist", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_concerts")
        .select("*")
        .eq("artist_id", artistId!)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Concert[];
    },
    enabled: !!artistId,
  });
}

export function useCreateConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Concert, "id" | "status"> & { status?: string }) => {
      const { data, error } = await supabase
        .from("music_concerts")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Concert;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["music-concerts"] }),
  });
}

export function usePurchaseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ concert_id, paid_cents, currency = "usd" }: { concert_id: string; paid_cents: number; currency?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_concert_tickets")
        .insert({ concert_id, user_id: u.user.id, paid_cents, currency })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["music-concert-ticket", v.concert_id] }),
  });
}

export function useMyTicket(concertId?: string) {
  return useQuery({
    queryKey: ["music-concert-ticket", concertId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !concertId) return null;
      const { data } = await supabase
        .from("music_concert_tickets")
        .select("*")
        .eq("concert_id", concertId)
        .eq("user_id", u.user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!concertId,
  });
}
