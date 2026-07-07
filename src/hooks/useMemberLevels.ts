import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Batch point-totals for the visible members/authors of a community surface.
 * ONE member_points query per page (.eq(creator_id) + .in(user_id)), summed
 * client-side exactly like the leaderboard (useMemberPoints in
 * useCommunityMembers.ts). Display levels derive from these totals via
 * getLevel (MemberXPBadge) — thresholds 0/25/100/300/1000, mirrored
 * server-side by public.member_level (20260707040000_levels_digest.sql).
 */
export function useMemberPointTotals(
  creatorId: string | undefined,
  userIds: (string | undefined)[]
) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))].sort();
  return useQuery({
    queryKey: ["member-point-totals", creatorId, ids],
    enabled: !!creatorId && ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("member_points")
        .select("user_id, points")
        .eq("creator_id", creatorId!)
        .in("user_id", ids);
      if (error) throw error;
      const totals = new Map<string, number>();
      for (const row of data || []) {
        totals.set(row.user_id, (totals.get(row.user_id) || 0) + row.points);
      }
      return totals;
    },
  });
}
