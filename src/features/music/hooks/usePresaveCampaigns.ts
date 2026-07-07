import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type PresavePlatform = "spotify" | "apple" | "tidal";

export interface PresaveCampaign {
  id: string;
  artist_id: string;
  release_title: string;
  artwork_url: string | null;
  release_date: string;
  spotify_url: string | null;
  apple_url: string | null;
  tidal_url: string | null;
  status: "active" | "released" | "canceled";
  presave_count: number;
  description: string | null;
}

export interface PresaveSignup {
  id: string;
  campaign_id: string;
  fan_id: string;
  email: string | null;
  platforms: PresavePlatform[];
  notified_at: string | null;
  created_at: string;
}

export function usePresaveCampaigns(artistId?: string) {
  return useQuery({
    queryKey: ["presave-campaigns", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_presave_campaigns").select("*").order("release_date", { ascending: true });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PresaveCampaign[];
    },
    staleTime: 30_000,
  });
}

export function usePresaveCampaign(id?: string) {
  return useQuery({
    queryKey: ["presave-campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_presave_campaigns")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as PresaveCampaign | null;
    },
  });
}

export function useMyPresaveSignup(campaignId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["presave-signup-mine", campaignId, user?.id],
    enabled: !!campaignId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_presave_signups")
        .select("*")
        .eq("campaign_id", campaignId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as PresaveSignup | null;
    },
  });
}

export function usePresave() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      email?: string;
      platforms?: PresavePlatform[];
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_presave_signups")
        .upsert(
          {
            campaign_id: input.campaign_id,
            fan_id: user.id,
            email: input.email ?? null,
            platforms: input.platforms ?? [],
          },
          { onConflict: "campaign_id,fan_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as PresaveSignup;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["presave-signup-mine", vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ["presave-campaign", vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ["presave-campaigns"] });
    },
  });
}

export function useCancelPresave() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (campaign_id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("music_presave_signups")
        .delete()
        .eq("campaign_id", campaign_id)
        .eq("fan_id", user.id);
      if (error) throw error;
      return campaign_id;
    },
    onSuccess: (campaign_id) => {
      qc.invalidateQueries({ queryKey: ["presave-signup-mine", campaign_id] });
      qc.invalidateQueries({ queryKey: ["presave-campaign", campaign_id] });
      qc.invalidateQueries({ queryKey: ["presave-campaigns"] });
    },
  });
}
