import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface StemListing {
  id: string;
  owner_id: string;
  track_id: string | null;
  title: string;
  description: string | null;
  genre: string | null;
  bpm: number | null;
  musical_key: string | null;
  preview_url: string | null;
  price_cents: number;
  currency: string;
  license_type: string;
  status: string;
  sold_count: number;
  created_at: string;
}

export interface StemFile {
  id: string;
  listing_id: string;
  stem_kind: string;
  file_url: string;
  file_format: string | null;
  file_size_bytes: number | null;
  position: number;
}

export interface StemPurchase {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount_cents: number;
  currency: string;
  download_count: number;
  created_at: string;
}

export function useLiveStemListings() {
  return useQuery({
    queryKey: ["stem-listings", "live"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("music_stem_listings")
        .select("*")
        .eq("status", "live")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StemListing[];
    },
  });
}

export function useMyStemListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stem-listings", "mine", user?.id],
    queryFn: async () => {
      if (!user) return [] as StemListing[];
      const { data, error } = await (supabase as any)
        .from("music_stem_listings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StemListing[];
    },
    enabled: !!user,
  });
}

export function useStemFiles(listingId?: string) {
  return useQuery({
    queryKey: ["stem-files", listingId],
    queryFn: async () => {
      if (!listingId) return [] as StemFile[];
      const { data, error } = await (supabase as any)
        .from("music_stem_files")
        .select("*")
        .eq("listing_id", listingId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StemFile[];
    },
    enabled: !!listingId,
  });
}

export function useCreateStemListing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<StemListing>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_stem_listings")
        .insert({ ...payload, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as StemListing;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stem-listings"] }),
  });
}

export function usePurchaseStem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listing: StemListing) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_stem_purchases")
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          amount_cents: listing.price_cents,
          currency: listing.currency,
        })
        .select()
        .single();
      if (error) throw error;
      await (supabase as any)
        .from("music_stem_listings")
        .update({ sold_count: listing.sold_count + 1 })
        .eq("id", listing.id);
      return data as StemPurchase;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stem-listings"] }),
  });
}
