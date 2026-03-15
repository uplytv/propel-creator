import { useState } from "react";
import { format, subWeeks, startOfWeek } from "date-fns";
import { 
  Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Clock, DollarSign, 
  CheckCircle2, CreditCard, Building2, CircleDollarSign, TrendingUp, 
  PieChart, Zap, Users, BookOpen, Video, Briefcase, SendHorizontal,
  Receipt, ArrowUpRight, ArrowDownRight, Sparkles
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWallet, useTransactions, usePayoutRequests } from "@/hooks/useWallet";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";
import SEOHead from "@/components/SEOHead";

const REVENUE_SOURCES = [
  { key: "subscription", label: "Subscriptions", icon: Users, color: "#00FF85" },
  { key: "course", label: "Courses", icon: BookOpen, color: "#38BDF8" },
  { key: "tip", label: "Tips", icon: Zap, color: "#A78BFA" },
  { key: "job", label: "Services", icon: Briefcase, color: "#F59E0B" },
  { key: "livestream", label: "Livestreams", icon: Video, color: "#F472B6" },
];

const typeBadge = (type: string) => {
  const map: Record<string, { color: string; label: string; icon: React.ElementType }> = {
    earn: { color: "bg-[#00FF85]/15 text-[#00FF85] border-[#00FF85]/20", label: "Earned", icon: ArrowDownRight },
    withdrawal: { color: "bg-destructive/15 text-destructive border-destructive/20", label: "Withdrawal", icon: ArrowUpRight },
    fee: { color: "bg-muted/50 text-muted-foreground border-border", label: "Fee", icon: Receipt },
    refund: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Refund", icon: ArrowDownCircle },
    tip: { color: "bg-purple-500/15 text-purple-400 border-purple-500/20", label: "Tip", icon: Zap },
    transfer: { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Transfer", icon: SendHorizontal },
  };
  const m = map[type] || { color: "bg-muted/50 text-muted-foreground border-border", label: type, icon: DollarSign };
  return (
    <Badge variant="outline" className={`${m.color} text-[10px] font-medium gap-1`}>
      <m.icon className="w-3 h-3" />
      {m.label}
    </Badge>
  );
};

const statusBadge = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Pending" },
    processing: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Processing" },
    completed: { color: "bg-[#00FF85]/15 text-[#00FF85] border-[#00FF85]/20", label: "Completed" },
    failed: { color: "bg-destructive/15 text-destructive border-destructive/20", label: "Failed" },
  };
  const m = map[status] || { color: "bg-muted/50 text-muted-foreground border-border", label: status };
  return <Badge variant="outline" className={`${m.color} text-[10px] font-medium`}>{m.label}</Badge>;
};

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
    </div>
  );
}

function BalanceCard({ label, amount, subtitle, accent, loading }: { label: string; amount: number; subtitle: string; accent?: string; loading: boolean }) {
  const colorClass = accent === "green" ? "text-[#00FF85]" : accent === "yellow" ? "text-yellow-400" : "text-foreground";
  const bgClass = accent === "green" ? "bg-[#00FF85]/5 border-[#00FF85]/15" : accent === "yellow" ? "bg-yellow-500/5 border-yellow-500/15" : "bg-card border-border";
  
  return (
    <div className={`rounded-2xl border p-4 ${bgClass}`}>
      {loading ? <Skeleton className="h-14 w-28" /> : (
        <>
          <p className={`text-xs font-medium mb-1 ${accent ? colorClass : "text-muted-foreground"}`}>{label}</p>
          <p className={`text-2xl md:text-3xl font-bold tracking-tight ${colorClass}`}>
            ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        </>
      )}
    </div>
  );
}

export default function Wallet() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: payouts = [], isLoading: payoutsLoading } = usePayoutRequests();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutSubmitted, setPayoutSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const available = Number(wallet?.available_balance ?? 0);
  const pending = Number(wallet?.pending_balance ?? 0);
  const lifetime = Number(wallet?.lifetime_earned ?? 0);
  const withdrawn = Number(wallet?.lifetime_withdrawn ?? 0);

  const amountError = payoutAmount && Number(payoutAmount) > available ? "Amount exceeds your available balance" : "";

  const handleRequestPayout = async () => {
    if (!user || !payoutAmount || Number(payoutAmount) <= 0 || Number(payoutAmount) > available) return;
    setSubmitting(true);
    const { error } = await supabase.from("payout_requests").insert({
      user_id: user.id,
      amount: Number(payoutAmount),
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPayoutSubmitted(true);
    }
  };

  // Revenue source breakdown
  const revenueBySource = useMemo(() => {
    const completed = transactions.filter((t: any) => t.type === "earn" && t.status === "completed");
    const sources: Record<string, number> = { subscription: 0, course: 0, tip: 0, job: 0, livestream: 0 };
    completed.forEach((t: any) => {
      const desc = (t.description || "").toLowerCase();
      const amt = Number(t.net_amount ?? t.amount);
      if (desc.includes("tip")) sources.tip += amt;
      else if (desc.includes("course") || desc.includes("lesson")) sources.course += amt;
      else if (desc.includes("job") || desc.includes("marketplace") || desc.includes("service")) sources.job += amt;
      else if (desc.includes("livestream") || desc.includes("stream")) sources.livestream += amt;
      else sources.subscription += amt;
    });
    return sources;
  }, [transactions]);

  const donutData = REVENUE_SOURCES.map(s => ({
    name: s.label,
    value: revenueBySource[s.key] || 0,
    color: s.color,
  }));
  const hasEarnings = donutData.some(d => d.value > 0);
  const totalEarned = donutData.reduce((s, d) => s + d.value, 0);

  // Weekly earnings for last 12 weeks
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; earned: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = startOfWeek(subWeeks(now, i - 1));
      const earned = transactions
        .filter((t: any) => t.type === "earn" && t.status === "completed")
        .filter((t: any) => {
          const d = new Date(t.created_at);
          return d >= weekStart && d < weekEnd;
        })
        .reduce((sum: number, t: any) => sum + Number(t.net_amount ?? t.amount), 0);
      weeks.push({ week: format(weekStart, "MMM d"), earned: parseFloat(earned.toFixed(2)) });
    }
    return weeks;
  }, [transactions]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTx = transactions.filter((t: any) => new Date(t.created_at) >= monthStart);
    const totalGross = monthTx.filter((t: any) => t.type === "earn").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalFees = monthTx.reduce((s: number, t: any) => s + Number(t.platform_fee_amount ?? 0), 0);
    const totalNet = monthTx.filter((t: any) => t.type === "earn").reduce((s: number, t: any) => s + Number(t.net_amount ?? t.amount), 0);
    const txCount = monthTx.filter((t: any) => t.type === "earn").length;
    return { totalGross, totalFees, totalNet, txCount };
  }, [transactions]);

  return (
    <AppLayout>
      <SEOHead title="Wallet | Uply" description="Your creator economy wallet — track earnings, request payouts, and manage your revenue." />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5 pb-24 md:pb-8 overflow-x-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF85]/10 flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-[#00FF85]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Creator Wallet</h1>
              <p className="text-xs text-muted-foreground">Your financial command center</p>
            </div>
          </div>
          <Badge variant="outline" className="border-[#00FF85]/20 text-[#00FF85] text-[10px] gap-1 hidden md:flex">
            <Sparkles className="w-3 h-3" /> Real-time
          </Badge>
        </div>

        {/* Primary Balance */}
        <div className="rounded-2xl border border-[#00FF85]/15 bg-[#00FF85]/5 p-5">
          {walletLoading ? <Skeleton className="h-16 w-40" /> : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#00FF85] mb-1">Available Balance</p>
                <p className="text-4xl font-bold tracking-tight text-[#00FF85]">
                  ${available.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Ready to withdraw</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#00FF85]/10 flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-[#00FF85]" />
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
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Earned</p>
                <p className="text-base font-bold">${lifetime.toFixed(2)}</p>
              </>
            )}
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-3">
            {walletLoading ? <Skeleton className="h-10 w-16" /> : (
              <>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Withdrawn</p>
                <p className="text-base font-bold">${withdrawn.toFixed(2)}</p>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => { setDrawerOpen(true); setPayoutSubmitted(false); setPayoutAmount(""); }}
            className="flex-1 h-11 bg-[#00FF85] hover:bg-[#00FF85]/90 text-black font-semibold rounded-xl gap-1.5 text-xs min-w-0"
          >
            <ArrowUpCircle className="w-4 h-4 shrink-0" /> Withdraw
          </Button>
          <Button
            onClick={() => setSendDrawerOpen(true)}
            className="flex-1 h-11 rounded-xl gap-1.5 font-semibold text-xs min-w-0 bg-secondary border border-border text-foreground hover:bg-secondary/80"
          >
            <SendHorizontal className="w-4 h-4 shrink-0" /> Pay Creator
          </Button>
        </div>

        {/* Revenue Sources - Horizontal scroll on mobile */}
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Revenue Streams</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5">
            {REVENUE_SOURCES.map(source => {
              const amount = revenueBySource[source.key] || 0;
              const pct = totalEarned > 0 ? ((amount / totalEarned) * 100).toFixed(0) : "0";
              return (
                <div
                  key={source.key}
                  className="min-w-[140px] md:min-w-0 rounded-xl border border-border bg-card p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${source.color}15` }}>
                      <source.icon className="w-4 h-4" style={{ color: source.color }} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{source.label}</span>
                  </div>
                  <p className="text-lg font-bold tracking-tight">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: source.color }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="bg-card border border-border w-full justify-start overflow-x-auto">
            <TabsTrigger value="transactions" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="payouts" className="text-xs">Payouts</TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs">Analytics</TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="transactions">
            {txLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : transactions.length === 0 ? (
              <EmptyState icon={DollarSign} title="No activity yet" subtitle="Start earning from memberships, courses, tips, and services — it all flows here." />
            ) : (
              <div className="space-y-2">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "earn" || tx.type === "tip" ? "bg-[#00FF85]/10" : tx.type === "withdrawal" ? "bg-destructive/10" : "bg-muted/50"
                    }`}>
                      {tx.type === "earn" || tx.type === "tip" ? (
                        <ArrowDownRight className="w-5 h-5 text-[#00FF85]" />
                      ) : tx.type === "withdrawal" ? (
                        <ArrowUpRight className="w-5 h-5 text-destructive" />
                      ) : (
                        <Receipt className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || "Transaction"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(tx.created_at), "MMM d, h:mm a")}</span>
                        {statusBadge(tx.status)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${tx.type === "earn" || tx.type === "tip" ? "text-[#00FF85]" : tx.type === "withdrawal" ? "text-destructive" : "text-foreground"}`}>
                        {tx.type === "earn" || tx.type === "tip" ? "+" : tx.type === "withdrawal" ? "-" : ""}${Number(tx.net_amount ?? tx.amount).toFixed(2)}
                      </p>
                      {Number(tx.platform_fee_amount ?? 0) > 0 && (
                        <p className="text-[10px] text-muted-foreground">-${Number(tx.platform_fee_amount).toFixed(2)} fee</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            {payoutsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : payouts.length === 0 ? (
              <EmptyState icon={Clock} title="No payouts yet" subtitle="Request your first withdrawal when you're ready." />
            ) : (
              <div className="space-y-2">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      <ArrowUpCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Payout Request</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(p.requested_at), "MMM d, yyyy")}</span>
                        {statusBadge(p.status)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">${Number(p.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{p.payout_method || "Pending setup"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="earnings">
            {/* Month Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "This Month", value: monthlySummary.totalNet, color: "text-[#00FF85]" },
                { label: "Gross Revenue", value: monthlySummary.totalGross, color: "text-foreground" },
                { label: "Platform Fees", value: monthlySummary.totalFees, color: "text-destructive" },
                { label: "Transactions", value: monthlySummary.txCount, color: "text-foreground", isCount: true },
              ].map(item => (
                <Card key={item.label} className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>
                    {(item as any).isCount ? item.value : `$${Number(item.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Area Chart */}
              <Card className="p-4">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" /> 12-Week Trend
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00FF85" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#00FF85" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                      <RechartsTooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Earned"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Area type="monotone" dataKey="earned" stroke="#00FF85" strokeWidth={2} fill="url(#earnedGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Donut Chart */}
              <Card className="p-4">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <PieChart className="w-3.5 h-3.5" /> Revenue Mix
                </h3>
                <div className="h-48 relative">
                  {!hasEarnings ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-28 h-28 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
                        <p className="text-[10px] text-muted-foreground text-center">No data yet</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={donutData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4} cornerRadius={4}>
                          {donutData.filter(d => d.value > 0).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                  {REVENUE_SOURCES.map(s => (
                    <div key={s.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Payout Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-[#00FF85]" /> Withdraw Funds
            </SheetTitle>
          </SheetHeader>

          {payoutSubmitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#00FF85]/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#00FF85]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Request submitted</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Funds typically arrive within 2–3 business days.</p>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="p-4 rounded-2xl bg-[#00FF85]/5 border border-[#00FF85]/15">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-[#00FF85]">${available.toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="pl-8 h-12 text-lg rounded-xl"
                    placeholder="0.00"
                  />
                </div>
                {amountError && <p className="text-xs text-destructive mt-1">{amountError}</p>}
                <button 
                  onClick={() => setPayoutAmount(available.toFixed(2))}
                  className="text-xs text-[#00FF85] hover:underline mt-1"
                >
                  Withdraw all
                </button>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Payout Method</label>
                <div className="space-y-2">
                  {[
                    { icon: Building2, label: "Bank Transfer", desc: "Direct deposit" },
                    { icon: CircleDollarSign, label: "PayPal", desc: "Instant transfer" },
                    { icon: CreditCard, label: "Stripe Connect", desc: "Auto-payouts" },
                  ].map(method => (
                    <div key={method.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card opacity-50 cursor-not-allowed">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                        <method.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{method.label}</p>
                        <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-yellow-500/20 text-yellow-400">Soon</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleRequestPayout}
                disabled={!payoutAmount || Number(payoutAmount) <= 0 || Number(payoutAmount) > available || submitting}
                className="w-full h-12 bg-[#00FF85] hover:bg-[#00FF85]/90 text-black font-semibold rounded-xl"
              >
                {submitting ? "Processing..." : "Request Withdrawal"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Send/Pay Creator Drawer */}
      <Sheet open={sendDrawerOpen} onOpenChange={setSendDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <SendHorizontal className="w-5 h-5 text-primary" /> Pay a Creator
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <SendHorizontal className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold mb-2">Cross-Creator Payments</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Send payments directly to other creators for collaborations, services, or revenue splits.
            </p>
            <Badge variant="outline" className="border-yellow-500/20 text-yellow-400">Coming Soon</Badge>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
