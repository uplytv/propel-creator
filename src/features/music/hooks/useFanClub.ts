import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface FanClubTier {
  id: string;
  artist_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  perks: string[];
  position: number;
  is_active: boolean;
}

export interface FanClubExclusive {
  id: string;
  artist_id: string;
  min_tier_id: string | null;
  kind: "post" | "audio" | "video" | "image";
  title: string;
  body: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  published_at: string;
}

export function useFanClubTiers(artistId?: string) {
  return useQuery({
    queryKey: ["fan-club-tiers", artistId],
    queryFn: async () => {
      if (!artistId) return [] as FanClubTier[];
      const { data } = await supabase
        .from("music_fan_club_tiers")
        .select("*")
        .eq("artist_id", artistId)
        .eq("is_active", true)
        .order("price_cents", { ascending: true });
      return (data as FanClubTier[]) ?? [];
    },
    enabled: !!artistId,
  });
}

export function useFanClubExclusives(artistId?: string) {
  return useQuery({
    queryKey: ["fan-club-exclusives", artistId],
    queryFn: async () => {
      if (!artistId) return [] as FanClubExclusive[];
      const { data } = await supabase
        .from("music_fan_club_exclusives")
        .select("*")
        .eq("artist_id", artistId)
        .order("published_at", { ascending: false });
      return (data as FanClubExclusive[]) ?? [];
    },
    enabled: !!artistId,
  });
}

export function useMyFanClubSubscription(artistId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-fan-club-sub", artistId, user?.id],
    queryFn: async () => {
      if (!artistId || !user) return null;
      const { data } = await supabase
        .from("music_fan_club_subscriptions")
        .select("*, tier:music_fan_club_tiers(*)")
        .eq("fan_id", user.id)
        .eq("artist_id", artistId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!artistId && !!user,
  });
}

export function useHasFanClubAccess(artistId?: string, minTierId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fan-club-access", artistId, minTierId, user?.id],
    queryFn: async () => {
      if (!artistId || !user) return false;
      const { data, error } = await supabase.rpc("has_fan_club_access", {
        _artist_id: artistId,
        _tier_id: minTierId ?? null,
      });
      if (error) return false;
      return Boolean(data);
    },
    enabled: !!artistId,
  });
}

export function useSubscribeToTier() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ tierId, artistId }: { tierId: string; artistId: string }) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("music_fan_club_subscriptions")
        .upsert({
          fan_id: user.id,
          artist_id: artistId,
          tier_id: tierId,
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
        }, { onConflict: "fan_id,tier_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-fan-club-sub"] });
      qc.invalidateQueries({ queryKey: ["fan-club-access"] });
    },
  });
}
