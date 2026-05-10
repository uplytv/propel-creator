import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SamplePack {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  currency: string;
  bpm: number | null;
  music_key: string | null;
  genre: string | null;
  tags: string[] | null;
  is_published: boolean;
  sales_count: number;
  created_at: string;
}

export interface Sample {
  id: string;
  pack_id: string;
  title: string;
  audio_url: string;
  preview_url: string | null;
  duration_seconds: number | null;
  sample_type: string;
  bpm: number | null;
  music_key: string | null;
  position: number;
}

export function useSamplePacks(filters?: { genre?: string; search?: string }) {
  return useQuery({
    queryKey: ["sample-packs", filters],
    queryFn: async () => {
      let q = supabase
        .from("music_sample_packs")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (filters?.genre) q = q.eq("genre", filters.genre);
      if (filters?.search) q = q.ilike("title", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SamplePack[];
    },
  });
}

export function useSamplePack(id: string | undefined) {
  return useQuery({
    queryKey: ["sample-pack", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_sample_packs")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as SamplePack | null;
    },
  });
}

export function usePackSamples(packId: string | undefined) {
  return useQuery({
    queryKey: ["pack-samples", packId],
    enabled: !!packId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_samples")
        .select("*")
        .eq("pack_id", packId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Sample[];
    },
  });
}

export function useMyPurchasedPacks() {
  return useQuery({
    queryKey: ["my-purchased-packs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("music_sample_purchases")
        .select("*, music_sample_packs(*)")
        .eq("buyer_id", user.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePurchasePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pack: SamplePack) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to purchase");
      const { error } = await supabase.from("music_sample_purchases").insert({
        pack_id: pack.id,
        buyer_id: user.id,
        amount_cents: pack.price_cents,
        currency: pack.currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-purchased-packs"] });
    },
  });
}
