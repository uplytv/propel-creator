import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MerchItem {
  id: string;
  artist_id: string;
  name: string;
  image_url: string | null;
  price_cents: number;
  currency: string;
  external_url: string | null;
  is_available: boolean;
}

export function useArtistMerch(artistId?: string) {
  return useQuery({
    queryKey: ["artist-merch", artistId],
    queryFn: async () => {
      if (!artistId) return [] as MerchItem[];
      const { data } = await supabase
        .from("artist_merch_items")
        .select("*")
        .eq("artist_id", artistId)
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      return (data as MerchItem[]) ?? [];
    },
    enabled: !!artistId,
  });
}

export function useAddMerchItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<MerchItem, "id" | "artist_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("artist_merch_items")
        .insert({ ...payload, artist_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artist-merch", user?.id] }),
  });
}

export function useDeleteMerchItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_merch_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artist-merch", user?.id] }),
  });
}
