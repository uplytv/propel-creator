import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * ad_campaigns — unified Ads Manager DRAFT store (Google / Facebook / Instagram).
 *
 * v1 stores drafts only. `external_id` is set exclusively by the Phase 2 platform
 * API layer (Google Ads API / Meta Marketing API) when a campaign is really
 * published — its presence is what distinguishes a live campaign from a draft.
 */

export type AdPlatform = "google" | "facebook" | "instagram";
export type AdCampaignStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "paused"
  | "archived";

export interface AdCampaignRow {
  id: string;
  creator_id: string;
  name: string;
  platform: AdPlatform;
  objective: string | null;
  status: AdCampaignStatus;
  budget_daily_cents: number | null;
  headline: string | null;
  primary_text: string | null;
  cta: string | null;
  audience: Record<string, unknown> | null;
  creative_url: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AdCampaignDraft = Partial<
  Omit<AdCampaignRow, "id" | "creator_id" | "created_at" | "updated_at">
> & { name: string; platform: AdPlatform };

export function useAdCampaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["ad_campaigns", user?.id];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdCampaignRow[];
    },
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ad_campaigns"] });

  const createCampaign = useMutation({
    mutationFn: async (draft: AdCampaignDraft) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ad_campaigns")
        .insert({ ...draft, creator_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AdCampaignRow;
    },
    onSuccess: invalidate,
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AdCampaignRow> & { id: string }) => {
      const { error } = await supabase
        .from("ad_campaigns")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const duplicateCampaign = useMutation({
    mutationFn: async (source: AdCampaignRow) => {
      if (!user) throw new Error("Not authenticated");
      const { id, creator_id, created_at, updated_at, external_id, ...rest } = source;
      const { error } = await supabase
        .from("ad_campaigns")
        .insert({
          ...rest,
          creator_id: user.id,
          name: `${source.name} (copy)`,
          status: "draft",
          external_id: null,
        });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    campaigns: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createCampaign: createCampaign.mutateAsync,
    isCreating: createCampaign.isPending,
    updateCampaign: updateCampaign.mutateAsync,
    duplicateCampaign: duplicateCampaign.mutateAsync,
    deleteCampaign: deleteCampaign.mutateAsync,
  };
}
