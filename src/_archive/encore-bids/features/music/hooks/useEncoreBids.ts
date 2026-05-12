import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EncoreBid {
  id: string;
  concert_id: string;
  user_id: string;
  track_id: string | null;
  song_title: string;
  bid_cents: number;
  message: string | null;
  status: string;
  created_at: string;
}

export function useEncoreBids(concertId?: string) {
  return useQuery({
    queryKey: ["encore-bids", concertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_encore_bids")
        .select("*")
        .eq("concert_id", concertId!)
        .order("bid_cents", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as EncoreBid[];
    },
    enabled: !!concertId,
    refetchInterval: 5000,
  });
}

export function usePlaceEncoreBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { concert_id: string; song_title: string; bid_cents: number; track_id?: string | null; message?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_encore_bids")
        .insert({ ...payload, user_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["encore-bids", v.concert_id] }),
  });
}
