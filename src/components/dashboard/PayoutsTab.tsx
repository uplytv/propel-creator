import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import {
  DollarSign, ExternalLink, Loader2, CheckCircle2, AlertCircle,
  TrendingUp, Users, CreditCard, Plus, Trash2, Calendar, Clock, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useReauthGuard } from "@/hooks/useReauthGuard";
import ReauthDialog from "@/components/ReauthDialog";

export function PayoutsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const { showReauth, reauthLoading, requireReauth, confirmReauth, cancelReauth } = useReauthGuard();
  const { data: walletData } = useWallet();
  const walletId = walletData?.id;

  const { data: stripeAccount, isLoading: accountLoading } = useQuery({
    queryKey: ["stripe-account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_stripe_accounts")
        .select("*")
        .eq("creator_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: revenueStats } = useQuery({
    queryKey: ["revenue-stats", user?.id, walletId],
    enabled: !!user && !!stripeAccount?.charges_enabled && !!walletId,
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: allTx } = await supabase
        .from("transactions")
        .select("amount, net_amount, completed_at, type")
        .eq("wallet_id", walletId!)
        .in("type", ["subscription", "subscription_renewal"])
        .eq("status", "completed");

      const { count: activeSubs } = await supabase
        .from("member_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user!.id)
        .eq("status", "active");

      const total = (allTx || []).reduce((s, t) => s + (t.net_amount || 0), 0);
      const thisMonth = (allTx || [])
        .filter((t) => t.completed_at && t.completed_at >= monthStart)
        .reduce((s, t) => s + (t.net_amount || 0), 0);

      return { total, thisMonth, activeSubs: activeSubs || 0, transactions: allTx || [] };
    },
  });

  const { data: recentTx } = useQuery({
    queryKey: ["recent-transactions", user?.id, walletId],
    enabled: !!user && !!stripeAccount?.charges_enabled && !!walletId,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", walletId!)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const doConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setConnecting(false);
  };

  const handleConnect = () => requireReauth(doConnect);

  const handleDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-dashboard-link");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  if (accountLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // Not connected
  if (!stripeAccount) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold mb-2">Connect Stripe to Get Paid</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Set up your Stripe account to accept subscription payments from your members. You'll receive payouts directly to your bank account.
        </p>
        <Button onClick={handleConnect} disabled={connecting} className="gap-2">
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          Connect Stripe
        </Button>
      </motion.div>
    );
  }

  // Connected but not fully onboarded
  if (!stripeAccount.charges_enabled) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-warning" />
        </div>
        <h3 className="text-lg font-bold mb-2">Complete Your Stripe Setup</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Your Stripe account is connected but requires additional information before you can accept payments.
        </p>
        <Button onClick={handleConnect} disabled={connecting} className="gap-2">
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          Continue Setup
        </Button>
      </motion.div>
    );
  }

  // Fully connected
  const pendingBalance = Number(walletData?.pending_balance ?? 0);
  const availableBalance = Number(walletData?.available_balance ?? 0);

  // Estimate next payout: Stripe does rolling payouts on a schedule (typically weekly, next Friday)
  const getNextPayoutDate = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFri = new Date(now);
    nextFri.setDate(now.getDate() + daysUntilFriday);
    return nextFri.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">Stripe connected — you're ready to accept payments</p>
        <Button variant="ghost" size="sm" onClick={handleDashboard} className="ml-auto gap-1.5 text-xs">
          <ExternalLink className="w-3.5 h-3.5" /> Stripe Dashboard
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 border-primary/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-muted-foreground">Available Balance</p>
          </div>
          <p className="text-2xl font-bold text-foreground">${availableBalance.toFixed(2)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold text-foreground">${pendingBalance.toFixed(2)}</p>
          {pendingBalance > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
              Est. payout: {getNextPayoutDate()}
            </p>
          )}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Revenue", value: `$${(revenueStats?.total ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-primary" },
          { label: "This Month", value: `$${(revenueStats?.thisMonth ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-primary" },
          { label: "Active Subscribers", value: revenueStats?.activeSubs ?? 0, icon: Users, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Recent Transactions</h3>
        </div>
        {recentTx && recentTx.length > 0 ? (
          <div className="divide-y divide-border">
            {recentTx.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{tx.description || tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.completed_at ? new Date(tx.completed_at).toLocaleDateString() : "Pending"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">+${(tx.net_amount || 0).toFixed(2)}</p>
                  {tx.platform_fee_amount > 0 && (
                    <p className="text-[10px] text-muted-foreground">Fee: ${tx.platform_fee_amount.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No transactions yet. They'll appear here when members subscribe.
          </div>
        )}
      </div>
    <ReauthDialog open={showReauth} loading={reauthLoading} onConfirm={confirmReauth} onCancel={cancelReauth} />
  </motion.div>
  );
}
