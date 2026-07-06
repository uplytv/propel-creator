import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/* ═══════════════════════════════════════════════════════════════════════════
   Tier-scoped content gating (client side of migration 20260706210000).

   subscription_tiers.tier_rank is the ladder position per creator
   (1 = cheapest). classroom_modules / classroom_lessons carry a nullable
   min_tier_rank; NULL = every member (legacy behavior). The server enforces
   this via has_tier_access() RLS — these hooks exist so the UI can (a) let
   creators pick a minimum tier and (b) tell an under-tier member WHICH tier
   to upgrade to.

   (supabase as any) casts: tier_rank / min_tier_rank are new columns not yet
   in the generated types.ts — remove casts after regenerating types.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface CreatorTier {
  id: string;
  name: string;
  price_monthly: number;
  /** Effective ladder rank — DB tier_rank, or the price-derived fallback for tiers created after the backfill. */
  tier_rank: number;
  is_active: boolean;
}

/**
 * All tiers for a creator (active + inactive — members can still hold subs to
 * deactivated tiers) with an effective rank. Mirrors the DB backfill exactly:
 * ROW_NUMBER over (price_monthly ASC, created_at ASC) across ALL tiers.
 */
export function useCreatorTiers(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["creator-tiers-ranked", creatorId],
    enabled: !!creatorId,
    staleTime: 60_000,
    queryFn: async (): Promise<CreatorTier[]> => {
      const { data, error } = await (supabase as any)
        .from("subscription_tiers")
        .select("id, name, price_monthly, tier_rank, is_active, created_at")
        .eq("creator_id", creatorId!)
        .order("price_monthly", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data || []) as any[]).map((t, i) => ({
        id: t.id,
        name: t.name,
        price_monthly: Number(t.price_monthly),
        tier_rank: t.tier_rank ?? i + 1,
        is_active: !!t.is_active,
      }));
    },
  });
}

/** The cheapest ACTIVE tier that satisfies a minimum rank (what to upsell). */
export function requiredTierForRank(
  tiers: CreatorTier[] | undefined,
  minRank: number | null | undefined,
): CreatorTier | null {
  if (minRank == null || !tiers) return null;
  return (
    tiers
      .filter((t) => t.is_active && t.tier_rank >= minRank)
      .sort((a, b) => a.tier_rank - b.tier_rank)[0] || null
  );
}

/**
 * A lesson's effective requirement is the stricter of its own min_tier_rank
 * and its parent module's. NULL/absent = no tier requirement.
 */
export function effectiveLessonMinRank(lesson: any, module?: any): number | null {
  const r = Math.max(lesson?.min_tier_rank ?? 0, module?.min_tier_rank ?? 0);
  return r > 0 ? r : null;
}

/**
 * The current user's highest tier rank with this creator (0 = no qualifying
 * subscription). Counts active AND trialing subs, matching has_tier_access.
 */
export function useMyTierRank(creatorId: string | undefined) {
  const { user } = useAuth();
  const tiersQuery = useCreatorTiers(creatorId);

  const subsQuery = useQuery({
    queryKey: ["my-tier-subs", creatorId, user?.id],
    enabled: !!creatorId && !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_subscriptions")
        .select("tier_id, status")
        .eq("member_id", user!.id)
        .eq("creator_id", creatorId!)
        .in("status", ["active", "trialing"]);
      if (error) throw error;
      return data || [];
    },
  });

  const myRank = useMemo(() => {
    const tiers = tiersQuery.data || [];
    let max = 0;
    for (const sub of (subsQuery.data || []) as any[]) {
      const tier = tiers.find((t) => t.id === sub.tier_id);
      if (tier && tier.tier_rank > max) max = tier.tier_rank;
    }
    return max;
  }, [tiersQuery.data, subsQuery.data]);

  return {
    myRank,
    tiers: tiersQuery.data,
    isLoading: tiersQuery.isLoading || (!!user && subsQuery.isLoading),
  };
}
