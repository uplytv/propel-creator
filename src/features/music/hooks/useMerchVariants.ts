import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MerchVariant {
  id: string;
  merch_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  price_cents_override: number | null;
  stock_count: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface MerchProduct {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  currency: string;
  kind: string | null;
  in_stock: boolean;
}

export function useArtistMerch(artistId?: string) {
  return useQuery({
    queryKey: ["artist-merch", artistId],
    queryFn: async () => {
      if (!artistId) return [] as MerchProduct[];
      const { data } = await supabase
        .from("artist_merch")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      return (data as MerchProduct[]) ?? [];
    },
    enabled: !!artistId,
  });
}

export function useMerchVariants(merchId?: string) {
  return useQuery({
    queryKey: ["merch-variants", merchId],
    queryFn: async () => {
      if (!merchId) return [] as MerchVariant[];
      const { data } = await supabase
        .from("artist_merch_variants")
        .select("*")
        .eq("merch_id", merchId)
        .order("position", { ascending: true });
      return (data as MerchVariant[]) ?? [];
    },
    enabled: !!merchId,
  });
}

export function useUpsertVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      v: Partial<MerchVariant> & { merch_id: string },
    ) => {
      const { data, error } = await supabase
        .from("artist_merch_variants")
        .upsert(v)
        .select()
        .single();
      if (error) throw error;
      return data as MerchVariant;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["merch-variants", d.merch_id] }),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, merch_id }: { id: string; merch_id: string }) => {
      const { error } = await supabase
        .from("artist_merch_variants")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return merch_id;
    },
    onSuccess: (merchId) => qc.invalidateQueries({ queryKey: ["merch-variants", merchId] }),
  });
}

export function useDecrementVariantStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, qty = 1 }: { variantId: string; qty?: number }) => {
      const { data, error } = await supabase.rpc("decrement_merch_variant_stock", {
        _variant_id: variantId,
        _qty: qty,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merch-variants"] }),
  });
}
