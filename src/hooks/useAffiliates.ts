import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useAffiliateLink() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-link", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Try to get or generate affiliate code via edge function
      const { data, error } = await supabase.functions.invoke("generate-affiliate-code", {
        body: { type: "platform" },
      });
      if (error) throw error;
      return data as { code: string; id: string };
    },
  });
}

export function useAffiliateStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: link } = await supabase
        .from("affiliate_links")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      const { data: conversions } = await supabase
        .from("affiliate_conversions")
        .select("*")
        .eq("referring_user_id", user!.id)
        .order("created_at", { ascending: false });

      const totalEarnings = (conversions || []).reduce((sum, c) => sum + Number(c.commission_amount), 0);
      const pendingEarnings = (conversions || []).filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.commission_amount), 0);

      return {
        link,
        conversions: conversions || [],
        totalClicks: link?.clicks || 0,
        totalSignups: link?.signups || 0,
        totalEarnings,
        pendingEarnings,
      };
    },
  });
}

export function useCreatorAffiliateProgram(creatorId?: string) {
  return useQuery({
    queryKey: ["creator-affiliate-program", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_affiliate_programs")
        .select("*")
        .eq("creator_id", creatorId!)
        .maybeSingle();
      return data;
    },
  });
}

export function useUpsertCreatorAffiliateProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { commission_rate: number; cookie_duration_days: number; is_active: boolean }) => {
      const { data: existing } = await supabase
        .from("creator_affiliate_programs")
        .select("id")
        .eq("creator_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("creator_affiliate_programs")
          .update(params)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("creator_affiliate_programs")
          .insert({ creator_id: user!.id, ...params });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-affiliate-program"] });
    },
  });
}

export function useCreatorAffiliateMembers(programId?: string) {
  return useQuery({
    queryKey: ["creator-affiliate-members", programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_affiliate_members")
        .select("*")
        .eq("program_id", programId!)
        .order("earnings", { ascending: false });
      return data || [];
    },
  });
}

export function useMemberAffiliateCode(programId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["member-affiliate-code", programId, user?.id],
    enabled: !!programId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-affiliate-code", {
        body: { type: "creator", program_id: programId },
      });
      if (error) throw error;
      return data as { code: string; id: string };
    },
  });
}

// Admin hooks
export function useAdminAffiliateStats() {
  return useQuery({
    queryKey: ["admin-affiliate-stats"],
    queryFn: async () => {
      const [
        { count: totalLinks },
        { data: conversions },
        { data: topBySignups },
      ] = await Promise.all([
        supabase.from("affiliate_links").select("*", { count: "exact", head: true }),
        supabase.from("affiliate_conversions").select("*").order("created_at", { ascending: false }),
        supabase.from("affiliate_links").select("*").order("signups", { ascending: false }).limit(10),
      ]);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const monthlySignups = (conversions || []).filter(
        c => c.conversion_type === "signup" && new Date(c.created_at) >= thisMonth
      ).length;

      const pendingCommissions = (conversions || []).filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.commission_amount), 0);

      const topByRevenue = [...(topBySignups || [])].sort((a, b) => Number(b.revenue_generated) - Number(a.revenue_generated)).slice(0, 10);

      return {
        totalLinks: totalLinks || 0,
        monthlySignups,
        pendingCommissions,
        conversions: conversions || [],
        topBySignups: topBySignups || [],
        topByRevenue,
      };
    },
  });
}

export function useMarkConversionsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("affiliate_conversions")
        .update({ status: "paid" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliate-stats"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-stats"] });
    },
  });
}
