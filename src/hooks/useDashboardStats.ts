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

      // Run all queries in parallel, each failing gracefully
      const [
        liveStreamsResult,
        walletResult,
      ] = await Promise.all([
        // Total live streams
        supabase
          .from("mux_live_streams")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then(r => r.count ?? 0)
          .catch(() => 0),

        // Wallet data for revenue
        supabase
          .from("wallets")
          .select("lifetime_earned, available_balance, pending_balance")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(r => r.data)
          .catch(() => null),
      ]);

      return {
        totalMembers: 0, // No subscriptions table yet
        activeSubscribers: 0, // No subscriptions table yet
        totalRevenue: Number(walletResult?.lifetime_earned ?? 0),
        revenueThisMonth: 0, // Will wire when transactions are scoped by creator
        newMembersThisWeek: 0, // No subscriptions table yet
        totalLiveStreams: liveStreamsResult as number,
      };
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30s
  });
}

const defaultStats: DashboardStats = {
  totalMembers: 0,
  activeSubscribers: 0,
  totalRevenue: 0,
  revenueThisMonth: 0,
  newMembersThisWeek: 0,
  totalLiveStreams: 0,
};
