import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CrowdfundCampaign {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  kind: string;
  goal_cents: number;
  raised_cents: number;
  currency: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrowdfundTier {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  pledge_cents: number;
  perks: string | null;
  limit_count: number | null;
  claimed_count: number;
  sort_order: number;
}

export function useLiveCampaigns() {
  return useQuery({
    queryKey: ["cfund", "live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_crowdfund_campaigns")
        .select("*")
        .in("status", ["live", "successful", "ended"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CrowdfundCampaign[];
    },
  });
}

export function useMyCampaigns() {
  return useQuery({
    queryKey: ["cfund", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_crowdfund_campaigns")
        .select("*")
        .eq("creator_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CrowdfundCampaign[];
    },
  });
}

export function useCampaignTiers(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["cfund-tiers", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_crowdfund_tiers")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as CrowdfundTier[];
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CrowdfundCampaign>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("music_crowdfund_campaigns")
        .insert({
          creator_id: auth.user.id,
          title: input.title || "Untitled Campaign",
          description: input.description ?? null,
          cover_url: input.cover_url ?? null,
          kind: input.kind ?? "album",
          goal_cents: input.goal_cents ?? 0,
          status: input.status ?? "live",
          ends_at: input.ends_at ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CrowdfundCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cfund"] });
      toast.success("Campaign launched");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CrowdfundTier> & { campaign_id: string }) => {
      const { data, error } = await supabase
        .from("music_crowdfund_tiers")
        .insert({
          campaign_id: input.campaign_id,
          title: input.title || "Backer Tier",
          description: input.description ?? null,
          pledge_cents: input.pledge_cents ?? 0,
          perks: input.perks ?? null,
          limit_count: input.limit_count ?? null,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CrowdfundTier;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cfund-tiers", vars.campaign_id] });
      toast.success("Tier added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaign,
      tier,
      message,
    }: {
      campaign: CrowdfundCampaign;
      tier?: CrowdfundTier;
      message?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in required");
      const amount = tier?.pledge_cents ?? 0;
      const { data, error } = await supabase
        .from("music_crowdfund_pledges")
        .insert({
          campaign_id: campaign.id,
          tier_id: tier?.id ?? null,
          backer_id: auth.user.id,
          amount_cents: amount,
          message: message ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const newRaised = campaign.raised_cents + amount;
      await supabase
        .from("music_crowdfund_campaigns")
        .update({
          raised_cents: newRaised,
          status: newRaised >= campaign.goal_cents && campaign.goal_cents > 0 ? "successful" : campaign.status,
        })
        .eq("id", campaign.id);
      if (tier) {
        await supabase
          .from("music_crowdfund_tiers")
          .update({ claimed_count: tier.claimed_count + 1 })
          .eq("id", tier.id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cfund"] });
      qc.invalidateQueries({ queryKey: ["cfund-tiers"] });
      toast.success("Thanks for backing!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
