import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface DashboardStats {
  totalMembers: number;
  activeSubscribers: number;
  totalRevenue: number;
  revenueThisMonth: number;
  newMembersThisWeek: number;
  totalLiveStreams: number;
  totalProductSales: number;
  productRevenue: number;
}

async function safeQuery<T>(fn: () => PromiseLike<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) return defaultStats;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        liveStreamsCount,
        walletData,
        membersCount,
        subscribersCount,
        newMembersCount,
        productSales,
        monthlyRevenue,
      ] = await Promise.all([
        safeQuery(async () => {
          const r = await supabase.from("mux_live_streams").select("id", { count: "exact", head: true }).eq("user_id", user.id);
          return r.count ?? 0;
        }, 0),
        safeQuery(async () => {
          const r = await supabase.from("wallets").select("lifetime_earned").eq("user_id", user.id).maybeSingle();
          return r.data;
        }, null),
        safeQuery(async () => {
          const r = await supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", user.id);
          return r.count ?? 0;
        }, 0),
        safeQuery(async () => {
          const r = await supabase.from("member_subscriptions").select("id", { count: "exact", head: true }).eq("creator_id", user.id).eq("status", "active");
          return r.count ?? 0;
        }, 0),
        safeQuery(async () => {
          const r = await supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", user.id).gte("joined_at", sevenDaysAgo);
          return r.count ?? 0;
        }, 0),
        safeQuery(async () => {
          const r = await supabase.from("product_purchases").select("id, amount").eq("creator_id", user.id);
          const data = r.data || [];
          return {
            count: data.length,
            revenue: data.reduce((sum, p: any) => sum + Number(p.amount || 0), 0),
          };
        }, { count: 0, revenue: 0 }),
        safeQuery(async () => {
          // Scope to this creator's wallet — transactions is a platform-wide table
          const w = await supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle();
          if (!w.data?.id) return 0;
          const r = await supabase.from("transactions").select("net_amount").eq("wallet_id", w.data.id).gte("completed_at", startOfMonth).eq("status", "completed");
          const data = r.data || [];
          return data.reduce((sum, t: any) => sum + Number(t.net_amount || 0), 0);
        }, 0),
      ]);

      return {
        totalMembers: membersCount,
        activeSubscribers: subscribersCount,
        totalRevenue: Number((walletData as any)?.lifetime_earned ?? 0),
        revenueThisMonth: monthlyRevenue,
        newMembersThisWeek: newMembersCount,
        totalLiveStreams: liveStreamsCount,
        totalProductSales: productSales.count,
        productRevenue: productSales.revenue,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

const defaultStats: DashboardStats = {
  totalMembers: 0,
  activeSubscribers: 0,
  totalRevenue: 0,
  revenueThisMonth: 0,
  newMembersThisWeek: 0,
  totalLiveStreams: 0,
  totalProductSales: 0,
  productRevenue: 0,
};
