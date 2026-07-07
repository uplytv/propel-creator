import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MerchBundle {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  currency: string;
  bundle_type: string;
  release_id: string | null;
  tour_id: string | null;
  status: string;
  inventory_count: number | null;
  sold_count: number;
  created_at: string;
}

export interface MerchBundleItem {
  id: string;
  bundle_id: string;
  item_kind: string;
  item_ref_id: string | null;
  label: string | null;
  position: number;
}

export function useLiveMerchBundles() {
  return useQuery({
    queryKey: ["merch-bundles", "live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_merch_bundles")
        .select("*")
        .eq("status", "live")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MerchBundle[];
    },
  });
}

export function useMyMerchBundles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["merch-bundles", "mine", user?.id],
    queryFn: async () => {
      if (!user) return [] as MerchBundle[];
      const { data, error } = await supabase
        .from("music_merch_bundles")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MerchBundle[];
    },
    enabled: !!user,
  });
}

export function useBundleItems(bundleId?: string) {
  return useQuery({
    queryKey: ["merch-bundle-items", bundleId],
    queryFn: async () => {
      if (!bundleId) return [] as MerchBundleItem[];
      const { data, error } = await supabase
        .from("music_merch_bundle_items")
        .select("*")
        .eq("bundle_id", bundleId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MerchBundleItem[];
    },
    enabled: !!bundleId,
  });
}

export function useCreateBundle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MerchBundle>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_merch_bundles")
        .insert({ ...payload, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as MerchBundle;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merch-bundles"] });
    },
  });
}

export function useAddBundleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MerchBundleItem> & { bundle_id: string }) => {
      const { data, error } = await supabase
        .from("music_merch_bundle_items")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as MerchBundleItem;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["merch-bundle-items", vars.bundle_id] });
    },
  });
}
