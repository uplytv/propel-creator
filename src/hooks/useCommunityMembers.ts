import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { fetchProfileMap } from "@/lib/supabaseTyped";

export function useCommunityMembers(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["community-members", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("joined_at", { ascending: false });
      if (error) throw error;

      const members = data || [];
      const userIds = members.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const profileMap = await fetchProfileMap(userIds);

      return members.map((m) => ({
        ...m,
        display_name: profileMap.get(m.user_id)?.display_name || "Member",
        avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
      }));
    },
  });
}

export function useMemberCount(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["member-count", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId!);
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useIsMember(creatorId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-member", creatorId, user?.id],
    enabled: !!creatorId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_members")
        .select("id")
        .eq("creator_id", creatorId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useJoinCommunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_members")
        .insert({ creator_id: creatorId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
      queryClient.invalidateQueries({ queryKey: ["is-member"] });
      queryClient.invalidateQueries({ queryKey: ["member-count"] });
    },
  });
}

export function useLeaveCommunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("creator_id", creatorId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
      queryClient.invalidateQueries({ queryKey: ["is-member"] });
      queryClient.invalidateQueries({ queryKey: ["member-count"] });
    },
  });
}

export function useMemberPoints(creatorId: string | undefined, period?: "weekly" | "all") {
  return useQuery({
    queryKey: ["member-points", creatorId, period],
    enabled: !!creatorId,
    queryFn: async () => {
      let query = supabase
        .from("member_points")
        .select("user_id, points")
        .eq("creator_id", creatorId!);

      if (period === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const pointsMap = new Map<string, number>();
      for (const row of data || []) {
        pointsMap.set(row.user_id, (pointsMap.get(row.user_id) || 0) + row.points);
      }

      const sorted = [...pointsMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([userId, total], idx) => ({ user_id: userId, total_points: total, rank: idx + 1 }));

      const userIds = sorted.map((s) => s.user_id);
      if (userIds.length === 0) return [];

      const profileMap = await fetchProfileMap(userIds);

      return sorted.map((s) => ({
        ...s,
        display_name: profileMap.get(s.user_id)?.display_name || "Member",
        avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
      }));
    },
  });
}

export function useCommunityEvents(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["community-events", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: { creator_id: string; title: string; description: string; event_date: string; event_time?: string; link?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_events")
        .insert(event);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-events"] });
    },
  });
}
