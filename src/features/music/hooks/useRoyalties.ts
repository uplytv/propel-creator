import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrackRightsHolders(trackId?: string) {
  return useQuery({
    queryKey: ["music-rights-holders", trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_rights_holders")
        .select("*")
        .eq("track_id", trackId!)
        .order("share_percent", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertRightsHolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const payload = { ...input, owner_id: auth.user.id };
      const { data, error } = await supabase
        .from("music_rights_holders")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["music-rights-holders", d.track_id] }),
  });
}

export function useDeleteRightsHolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("music_rights_holders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["music-rights-holders"] }),
  });
}

export function useTrackRoyaltyEvents(trackId?: string) {
  return useQuery({
    queryKey: ["music-royalty-events", trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_royalty_events")
        .select("*")
        .eq("track_id", trackId!)
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDistributeRoyaltyEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.rpc("distribute_royalty_event", { _event_id: eventId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-royalty-events"] });
      qc.invalidateQueries({ queryKey: ["music-royalty-payouts"] });
      qc.invalidateQueries({ queryKey: ["my-royalty-payouts"] });
    },
  });
}

export function useMyRoyaltyPayouts() {
  return useQuery({
    queryKey: ["my-royalty-payouts"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_royalty_payouts")
        .select("*, music_royalty_events(track_id, source, occurred_at)")
        .eq("payee_user_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
