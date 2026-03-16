import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useCommunityMembers(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["community-members", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members" as any)
        .select("*")
        .eq("creator_id", creatorId!)
        .order("joined_at", { ascending: false });
      if (error) throw error;

      const members = (data || []) as any[];
      const userIds = members.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return members.map((m) => ({
        ...m,
        display_name: (profileMap.get(m.user_id) as any)?.display_name || "Member",
        avatar_url: (profileMap.get(m.user_id) as any)?.avatar_url || null,
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
        .from("community_members" as any)
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
        .from("community_members" as any)
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
        .from("community_members" as any)
        .insert({ creator_id: creatorId, user_id: user.id } as any);
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
        .from("community_members" as any)
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
        .from("member_points" as any)
        .select("user_id, points")
        .eq("creator_id", creatorId!);

      if (period === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by user
      const pointsMap = new Map<string, number>();
      for (const row of (data || []) as any[]) {
        pointsMap.set(row.user_id, (pointsMap.get(row.user_id) || 0) + row.points);
      }

      const sorted = [...pointsMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([userId, total], idx) => ({ user_id: userId, total_points: total, rank: idx + 1 }));

      // Fetch profiles
      const userIds = sorted.map((s) => s.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return sorted.map((s) => ({
        ...s,
        display_name: (profileMap.get(s.user_id) as any)?.display_name || "Member",
        avatar_url: (profileMap.get(s.user_id) as any)?.avatar_url || null,
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
        .from("community_events" as any)
        .select("*")
        .eq("creator_id", creatorId!)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
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
        .from("community_events" as any)
        .insert(event as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-events"] });
    },
  });
}
