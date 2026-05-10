import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MusicDrop {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  artwork_url: string | null;
  audio_url: string | null;
  edition_cap: number;
  editions_sold: number;
  price_cents: number;
  currency: string;
  status: string;
  drops_at: string | null;
  ends_at: string | null;
}

export interface DropEdition {
  id: string;
  drop_id: string;
  collector_id: string;
  edition_number: number;
  amount_cents: number;
  currency: string;
  claimed_at: string;
}

export function useActiveDrops() {
  return useQuery({
    queryKey: ["music-drops", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_drops")
        .select("*")
        .in("status", ["active", "sold_out"])
        .order("drops_at", { ascending: false, nullsFirst: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as MusicDrop[];
    },
  });
}

export function useDrop(id: string | undefined) {
  return useQuery({
    queryKey: ["music-drop", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_drops")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as MusicDrop | null;
    },
  });
}

export function useMyDropEdition(dropId: string | undefined) {
  return useQuery({
    queryKey: ["my-drop-edition", dropId],
    enabled: !!dropId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("music_drop_editions")
        .select("*")
        .eq("drop_id", dropId!)
        .eq("collector_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as DropEdition | null;
    },
  });
}

export function useMyCollection() {
  return useQuery({
    queryKey: ["my-drop-collection"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("music_drop_editions")
        .select("*, music_drops(*)")
        .eq("collector_id", user.id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClaimDropEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dropId: string) => {
      const { data, error } = await supabase.rpc("claim_music_drop_edition", { _drop_id: dropId });
      if (error) throw error;
      return data as unknown as DropEdition;
    },
    onSuccess: (_, dropId) => {
      qc.invalidateQueries({ queryKey: ["music-drop", dropId] });
      qc.invalidateQueries({ queryKey: ["my-drop-edition", dropId] });
      qc.invalidateQueries({ queryKey: ["my-drop-collection"] });
      qc.invalidateQueries({ queryKey: ["music-drops", "active"] });
    },
  });
}
