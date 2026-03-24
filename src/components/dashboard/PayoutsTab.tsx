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
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";

export function PayoutsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);

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
    queryKey: ["revenue-stats", user?.id],
    enabled: !!user && !!stripeAccount?.charges_enabled,
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: allTx } = await supabase
        .from("transactions")
        .select("amount, net_amount, completed_at, type")
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
    queryKey: ["recent-transactions", user?.id],
    enabled: !!user && !!stripeAccount?.charges_enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConnecting(false);
  };

  const handleDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-dashboard-link");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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

      {/* Revenue cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Revenue", value: `$${(revenueStats?.total ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-emerald-400" },
          { label: "This Month", value: `$${(revenueStats?.thisMonth ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-blue-400" },
          { label: "Active Subscribers", value: revenueStats?.activeSubs ?? 0, icon: Users, color: "text-violet-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
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
    </motion.div>
  );
}
