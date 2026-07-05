import { useState } from "react";
import { format, startOfWeek, subWeeks, nextFriday } from "date-fns";
import {
  Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Clock, DollarSign,
  CheckCircle2, CreditCard, CircleDollarSign, TrendingUp,
  Zap, Users, BookOpen, Video, Briefcase, SendHorizontal,
  Receipt, ArrowUpRight, ArrowDownRight, Sparkles, Calendar, ExternalLink
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import AppLayout from "@/components/layout/AppLayout";
import PageHero from "@/components/layout/PageHero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet, useTransactions, usePayoutRequests } from "@/hooks/useWallet";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemo } from "react";
import SEOHead from "@/components/SEOHead";
import StripeGate from "@/components/StripeGate";

const REVENUE_SOURCES = [
  { key: "subscription", label: "Subscriptions", icon: Users, color: "hsl(var(--primary))" },
  { key: "course", label: "Courses", icon: BookOpen, color: "hsl(210 100% 60%)" },
  { key: "tip", label: "Tips", icon: Zap, color: "hsl(260 70% 70%)" },
  { key: "job", label: "Services", icon: Briefcase, color: "hsl(38 92% 50%)" },
  { key: "livestream", label: "Livestreams", icon: Video, color: "hsl(330 80% 65%)" },
];

const typeBadge = (type: string) => {
  const map: Record<string, { color: string; label: string; icon: React.ElementType }> = {
    earn: { color: "bg-primary/15 text-primary border-primary/20", label: "Earned", icon: ArrowDownRight },
    withdrawal: { color: "bg-destructive/15 text-destructive border-destructive/20", label: "Withdrawal", icon: ArrowUpRight },
    fee: { color: "bg-muted/50 text-muted-foreground border-border", label: "Fee", icon: Receipt },
    refund: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Refund", icon: ArrowDownCircle },
    tip: { color: "bg-primary/15 text-primary border-primary/20", label: "Tip", icon: Zap },
    transfer: { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Transfer", icon: SendHorizontal },
    subscription: { color: "bg-primary/15 text-primary border-primary/20", label: "Subscription", icon: Users },
    subscription_renewal: { color: "bg-primary/15 text-primary border-primary/20", label: "Renewal", icon: Users },
  };
  const m = map[type] || { color: "bg-muted/50 text-muted-foreground border-border", label: type, icon: DollarSign };
  return (
    <Badge variant="outline" className={`${m.color} text-[10px] font-medium gap-1`}>
      <m.icon className="w-3 h-3" />
      {m.label}
    </Badge>
  );
};

export default function Wallet() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();

  const available = Number(wallet?.available_balance ?? 0);
  const pending = Number(wallet?.pending_balance ?? 0);
  const lifetime = Number(wallet?.lifetime_earned ?? 0);

  const revenueBySource = useMemo(() => {
    const completed = transactions.filter((t: any) => (t.type === "earn" || t.type === "tip" || t.type === "subscription" || t.type === "subscription_renewal") && t.status === "completed");
    const sources: Record<string, number> = { subscription: 0, course: 0, tip: 0, job: 0, livestream: 0 };
    completed.forEach((t: any) => {
      const desc = (t.description || "").toLowerCase();
      const type = t.type || "";
      const amt = Number(t.net_amount ?? t.amount);
      if (type === "tip" || desc.includes("tip")) sources.tip += amt;
      else if (type.includes("subscription") || desc.includes("subscription")) sources.subscription += amt;
      else if (desc.includes("course") || desc.includes("lesson")) sources.course += amt;
      else if (desc.includes("job") || desc.includes("service")) sources.job += amt;
      else if (desc.includes("stream")) sources.livestream += amt;
      else sources.subscription += amt;
    });
    return sources;
  }, [transactions]);

  const totalEarned = Object.values(revenueBySource).reduce((s, v) => s + v, 0);

  const handleOpenStripeDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-dashboard-link");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; earned: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = startOfWeek(subWeeks(now, i - 1));
      const earned = transactions
        .filter((t: any) => (t.type === "earn" || t.type === "tip" || t.type === "subscription" || t.type === "subscription_renewal") && t.status === "completed")
        .filter((t: any) => { const d = new Date(t.created_at); return d >= weekStart && d < weekEnd; })
        .reduce((sum: number, t: any) => sum + Number(t.net_amount ?? t.amount), 0);
      weeks.push({ week: format(weekStart, "MMM d"), earned: parseFloat(earned.toFixed(2)) });
    }
    return weeks;
  }, [transactions]);

  return (
    <AppLayout>
      <SEOHead title="Wallet | Uply" description="Your creator economy wallet — track earnings, request payouts, and manage your revenue." />
      <StripeGate>
        <PageHero
          eyebrow="Earnings"
          title="Creator Wallet"
          subtitle="Your financial command center"
          actions={
            <Badge variant="outline" className="border-primary/20 text-primary text-[10px] gap-1 hidden md:flex">
              <Sparkles className="w-3 h-3" /> Real-time
            </Badge>
          }
        />
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5 pb-24 md:pb-8 overflow-x-hidden">
          {/* Primary Balance */}
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
            {walletLoading ? <Skeleton className="h-16 w-40" /> : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Available Balance</p>
                  <p className="text-4xl font-bold tracking-tight text-primary">
                    ${available.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Stripe handles payouts automatically</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Secondary Balances */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-yellow-500/15 bg-yellow-500/5 p-3">
              {walletLoading ? <Skeleton className="h-10 w-16" /> : (
                <>
                  <p className="text-[10px] font-medium text-yellow-400 mb-0.5">Pending</p>
                  <p className="text-base font-bold text-yellow-400">${pending.toFixed(2)}</p>
                </>
              )}
            </div>
            <div className="flex-1 rounded-xl border border-border bg-card p-3">
              {walletLoading ? <Skeleton className="h-10 w-16" /> : (
                <>
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Lifetime</p>
                  <p className="text-base font-bold">${lifetime.toFixed(2)}</p>
                </>
              )}
            </div>
          </div>

          {/* Stripe Dashboard Button */}
          <Button onClick={handleOpenStripeDashboard} variant="outline" className="w-full gap-2">
            <ExternalLink className="w-4 h-4" /> View Stripe Dashboard
          </Button>
          <p className="text-xs text-center text-muted-foreground -mt-3">
            Stripe handles your payouts automatically on a 2-day rolling basis once your account is verified.
          </p>

          {/* Revenue Sources */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Revenue Streams</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5">
              {REVENUE_SOURCES.map(source => {
                const amount = revenueBySource[source.key] || 0;
                const pct = totalEarned > 0 ? ((amount / totalEarned) * 100).toFixed(0) : "0";
                return (
                  <div key={source.key} className="min-w-[140px] md:min-w-0 rounded-xl border border-border bg-card p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${source.color}15` }}>
                        <source.icon className="w-4 h-4" style={{ color: source.color }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{source.label}</span>
                    </div>
                    <p className="text-lg font-bold tracking-tight">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    {Number(pct) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: source.color }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Tab */}
          <Tabs defaultValue="transactions">
            <TabsList className="bg-card border border-border w-full justify-start overflow-x-auto">
              <TabsTrigger value="transactions" className="text-xs">Activity</TabsTrigger>
              <TabsTrigger value="earnings" className="text-xs">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              {txLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">No activity yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">Start earning from memberships, tips, and services.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === "earn" || tx.type === "tip" || tx.type === "subscription" ? "bg-primary/10" : "bg-muted/50"
                      }`}>
                        {tx.type === "earn" || tx.type === "tip" || tx.type === "subscription" || tx.type === "subscription_renewal" ? (
                          <ArrowDownRight className="w-5 h-5 text-primary" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tx.completed_at ? format(new Date(tx.completed_at), "MMM d, yyyy") : tx.created_at ? format(new Date(tx.created_at), "MMM d, yyyy") : "Pending"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${tx.type === "withdrawal" ? "text-destructive" : "text-primary"}`}>
                          {tx.type === "withdrawal" ? "-" : "+"}${Number(tx.net_amount ?? tx.amount).toFixed(2)}
                        </p>
                        {typeBadge(tx.type)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="earnings">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-4">Weekly Earnings (12 weeks)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="earned" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </StripeGate>
    </AppLayout>
  );
}
