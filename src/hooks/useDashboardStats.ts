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

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) return defaultStats;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel queries
      const [
        liveStreamsRes,
        walletRes,
        membersRes,
        subscribersRes,
        newMembersRes,
        productSalesRes,
        monthlyTransactionsRes,
      ] = await Promise.all([
        supabase
          .from("mux_live_streams")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then(r => r.count ?? 0)
          .catch(() => 0),
        supabase
          .from("wallets")
          .select("lifetime_earned")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(r => r.data)
          .catch(() => null),
        supabase
          .from("community_members")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id)
          .then(r => r.count ?? 0)
          .catch(() => 0),
        supabase
          .from("member_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id)
          .eq("status", "active")
          .then(r => r.count ?? 0)
          .catch(() => 0),
        supabase
          .from("community_members")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id)
          .gte("joined_at", sevenDaysAgo)
          .then(r => r.count ?? 0)
          .catch(() => 0),
        supabase
          .from("product_purchases")
          .select("id, amount")
          .eq("creator_id", user.id)
          .then(r => {
            const data = r.data || [];
            return {
              count: data.length,
              revenue: data.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
            };
          })
          .catch(() => ({ count: 0, revenue: 0 })),
        supabase
          .from("transactions")
          .select("net_amount")
          .gte("completed_at", startOfMonth)
          .eq("status", "completed")
          .then(r => {
            const data = r.data || [];
            return data.reduce((sum: number, t: any) => sum + Number(t.net_amount || 0), 0);
          })
          .catch(() => 0),
      ]);

      return {
        totalMembers: membersRes as number,
        activeSubscribers: subscribersRes as number,
        totalRevenue: Number((walletRes as any)?.lifetime_earned ?? 0),
        revenueThisMonth: monthlyTransactionsRes as number,
        newMembersThisWeek: newMembersRes as number,
        totalLiveStreams: liveStreamsRes as number,
        totalProductSales: (productSalesRes as any).count,
        productRevenue: (productSalesRes as any).revenue,
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
