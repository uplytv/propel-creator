import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface PreorderCampaign {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  format: string;
  cover_url: string | null;
  price_cents: number;
  currency: string;
  goal_units: number;
  units_reserved: number;
  ships_by: string | null;
  status: string;
  created_at: string;
}

export function usePreorderCampaigns(artistId?: string) {
  return useQuery({
    queryKey: ["preorder-campaigns", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("music_preorder_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PreorderCampaign[];
    },
    staleTime: 30_000,
  });
}

export function usePreorderCampaign(id?: string) {
  return useQuery({
    queryKey: ["preorder-campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_preorder_campaigns")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as PreorderCampaign | null;
    },
  });
}

export function useMyPreorders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-preorders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_preorders")
        .select("*, campaign:music_preorder_campaigns(*)")
        .eq("fan_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePreorder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      quantity: number;
      amount_cents: number;
      currency?: string;
      shipping_name?: string;
      shipping_address?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_preorders")
        .insert({
          fan_id: user.id,
          campaign_id: input.campaign_id,
          quantity: input.quantity,
          amount_cents: input.amount_cents,
          currency: input.currency ?? "usd",
          shipping_name: input.shipping_name ?? null,
          shipping_address: input.shipping_address ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["preorder-campaign", vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ["preorder-campaigns"] });
      qc.invalidateQueries({ queryKey: ["my-preorders"] });
    },
  });
}
