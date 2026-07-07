import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SuperFanTier = "Bronze" | "Silver" | "Gold" | "Diamond";

export interface SuperFan {
  user_id: string;
  plays: number;
  likes: number;
  purchases: number;
  score: number;
  tier: SuperFanTier;
}

export function useSuperFans(artistId?: string, limit = 10) {
  return useQuery({
    queryKey: ["super-fans", artistId, limit],
    queryFn: async (): Promise<SuperFan[]> => {
      if (!artistId) return [];
      const { data, error } = await supabase.rpc("get_super_fans", {
        _artist_id: artistId,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as SuperFan[];
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });
}

export const TIER_COLORS: Record<SuperFanTier, string> = {
  Bronze: "#CD7F32",
  Silver: "#C0C0C0",
  Gold: "#FFD700",
  Diamond: "#B9F2FF",
};

export const TIER_PERKS: Record<SuperFanTier, string[]> = {
  Bronze: ["Custom badge on profile"],
  Silver: ["Bronze perks", "Exclusive playlist access"],
  Gold: ["Silver perks", "Early access to new drops", "Discord role"],
  Diamond: ["Gold perks", "1-on-1 voice room invite", "Limited merch drops"],
};
