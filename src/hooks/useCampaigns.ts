import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { LaunchedCampaign } from "@/components/ads/BoostCampaignBuilder";

export interface CampaignRow {
  id: string;
  user_id: string;
  stream_title: string;
  objective: string;
  objective_label: string;
  daily_budget: number;
  duration: number;
  total_budget: number;
  audience: string;
  audience_label: string;
  platform: string;
  status: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  created_at: string;
  updated_at: string;
}

export function useCampaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CampaignRow[];
    },
    enabled: !!user,
  });

  // Realtime subscription for live metric updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("campaigns-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campaigns", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const launchMutation = useMutation({
    mutationFn: async (campaign: LaunchedCampaign) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("campaigns" as any).insert({
        user_id: user.id,
        stream_title: campaign.streamTitle,
        objective: campaign.objective,
        objective_label: campaign.objectiveLabel,
        daily_budget: campaign.dailyBudget,
        duration: campaign.duration,
        total_budget: campaign.dailyBudget * campaign.duration,
        audience: campaign.audience,
        audience_label: campaign.audienceLabel,
        platform: campaign.platform,
        status: "active",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("campaigns" as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  return {
    campaigns: query.data ?? [],
    isLoading: query.isLoading,
    launchCampaign: launchMutation.mutateAsync,
    isLaunching: launchMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
