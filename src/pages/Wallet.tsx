import { useState } from "react";
import { format, subWeeks, startOfWeek } from "date-fns";
import { Wallet as WalletIcon, ArrowDownCircle, Clock, DollarSign, CheckCircle2, XCircle, CreditCard, Building2, CircleDollarSign, TrendingUp, PieChart } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
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

const typeBadge = (type: string) => {
  const map: Record<string, { color: string; label: string }> = {
    earn: { color: "bg-[#00FF85]/20 text-[#00FF85]", label: "Earn" },
    withdrawal: { color: "bg-destructive/20 text-destructive", label: "Withdrawal" },
    fee: { color: "bg-muted text-muted-foreground", label: "Fee" },
    refund: { color: "bg-blue-500/20 text-blue-400", label: "Refund" },
    tip: { color: "bg-purple-500/20 text-purple-400", label: "Tip" },
  };
  const m = map[type] || { color: "bg-muted text-muted-foreground", label: type };
  return <Badge variant="outline" className={`${m.color} border-0 text-xs`}>{m.label}</Badge>;
};

const statusBadge = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-500/20 text-yellow-400", label: "Pending" },
    processing: { color: "bg-yellow-500/20 text-yellow-400", label: "Processing" },
    completed: { color: "bg-[#00FF85]/20 text-[#00FF85]", label: "Completed" },
    failed: { color: "bg-destructive/20 text-destructive", label: "Failed" },
  };
  const m = map[status] || { color: "bg-muted text-muted-foreground", label: status };
  return <Badge variant="outline" className={`${m.color} border-0 text-xs`}>{m.label}</Badge>;
};

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{subtitle}</p>
    </div>
  );
}

export default function Wallet() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: payouts = [], isLoading: payoutsLoading } = usePayoutRequests();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutSubmitted, setPayoutSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const available = Number(wallet?.available_balance ?? 0);
  const pending = Number(wallet?.pending_balance ?? 0);
  const lifetime = Number(wallet?.lifetime_earned ?? 0);

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

  // Earnings breakdown data
  const earningsData = useMemo(() => {
    const completed = transactions.filter((t: any) => t.type === "earn" && t.status === "completed");
    // Group by description keyword for demo breakdown
    let memberships = 0, tips = 0, jobs = 0;
    completed.forEach((t: any) => {
      const desc = (t.description || "").toLowerCase();
      if (desc.includes("tip")) tips += Number(t.net_amount ?? t.amount);
      else if (desc.includes("job") || desc.includes("marketplace")) jobs += Number(t.net_amount ?? t.amount);
      else memberships += Number(t.net_amount ?? t.amount);
    });
    return { memberships, tips, jobs };
  }, [transactions]);

  const donutData = [
    { name: "Memberships", value: earningsData.memberships, color: "#00FF85" },
    { name: "Tips", value: earningsData.tips, color: "#A78BFA" },
    { name: "Jobs", value: earningsData.jobs, color: "#38BDF8" },
  ];
  const hasEarnings = donutData.some(d => d.value > 0);

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
    const memberships = monthTx.filter((t: any) => t.type === "earn" && !(t.description || "").toLowerCase().includes("tip") && !(t.description || "").toLowerCase().includes("job")).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const tips = monthTx.filter((t: any) => t.type === "tip" || ((t.type === "earn") && (t.description || "").toLowerCase().includes("tip"))).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const jobs = monthTx.filter((t: any) => t.type === "earn" && ((t.description || "").toLowerCase().includes("job") || (t.description || "").toLowerCase().includes("marketplace"))).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const fees = monthTx.filter((t: any) => t.type === "fee").reduce((s: number, t: any) => s + Number(t.amount), 0) + monthTx.reduce((s: number, t: any) => s + Number(t.platform_fee_amount ?? 0), 0);
    const net = memberships + tips + jobs - fees;
    return { memberships, tips, jobs, fees, net };
  }, [transactions]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <WalletIcon className="w-7 h-7 text-[#00FF85]" />
          <h1 className="text-2xl font-bold">Wallet</h1>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-[#00FF85]/20 bg-[#00FF85]/5">
            {walletLoading ? <Skeleton className="h-12 w-32" /> : (
              <>
                <p className="text-sm text-[#00FF85] font-medium mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-[#00FF85]">${available.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
              </>
            )}
          </Card>
          <Card className="p-5 border-yellow-500/20 bg-yellow-500/5">
            {walletLoading ? <Skeleton className="h-12 w-32" /> : (
              <>
                <p className="text-sm text-yellow-400 font-medium mb-1">Pending Balance</p>
                <p className="text-3xl font-bold text-yellow-400">${pending.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Clears in 7 days</p>
              </>
            )}
          </Card>
          <Card className="p-5">
            {walletLoading ? <Skeleton className="h-12 w-32" /> : (
              <>
                <p className="text-sm text-muted-foreground font-medium mb-1">Lifetime Earned</p>
                <p className="text-3xl font-bold">${lifetime.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total earnings to date</p>
              </>
            )}
          </Card>
        </div>

        {/* Request Payout Button */}
        <Button
          onClick={() => { setDrawerOpen(true); setPayoutSubmitted(false); setPayoutAmount(""); }}
          className="w-full md:w-auto bg-[#00FF85] hover:bg-[#00FF85]/90 text-black font-semibold"
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" /> Request Payout
        </Button>

        {/* Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payouts">Payout History</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            {txLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : transactions.length === 0 ? (
              <EmptyState icon={DollarSign} title="No transactions yet" subtitle="Your earnings will appear here once members start joining." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-2">Date</th>
                      <th className="py-3 px-2">Description</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2 text-right">Gross</th>
                      <th className="py-3 px-2 text-right">Fee</th>
                      <th className="py-3 px-2 text-right">Net</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")}</td>
                        <td className="py-3 px-2">{tx.description || "—"}</td>
                        <td className="py-3 px-2">{typeBadge(tx.type)}</td>
                        <td className="py-3 px-2 text-right">${Number(tx.amount).toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground">${Number(tx.platform_fee_amount ?? 0).toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-medium">${Number(tx.net_amount ?? tx.amount).toFixed(2)}</td>
                        <td className="py-3 px-2">{statusBadge(tx.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payouts">
            {payoutsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : payouts.length === 0 ? (
              <EmptyState icon={Clock} title="No payout requests yet" subtitle="Your payout history will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-2">Date Requested</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                      <th className="py-3 px-2">Method</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Date Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 text-muted-foreground">{format(new Date(p.requested_at), "MMM d, yyyy")}</td>
                        <td className="py-3 px-2 text-right font-medium">${Number(p.amount).toFixed(2)}</td>
                        <td className="py-3 px-2">{p.payout_method || "—"}</td>
                        <td className="py-3 px-2">{statusBadge(p.status)}</td>
                        <td className="py-3 px-2 text-muted-foreground">{p.processed_at ? format(new Date(p.processed_at), "MMM d, yyyy") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="earnings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Donut Chart */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-muted-foreground" /> Earnings by Source</h3>
                <div className="h-56 relative">
                  {!hasEarnings ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto rounded-full border-4 border-muted flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">No earnings yet</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex gap-4 justify-center mt-2">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Line Chart */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" /> Weekly Earnings (12 weeks)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                      <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Line type="monotone" dataKey="earned" stroke="#00FF85" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Monthly breakdown */}
            <Card className="p-5 mt-6">
              <h3 className="text-sm font-semibold mb-4">This Month's Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "Memberships", value: monthlySummary.memberships, color: "text-[#00FF85]" },
                  { label: "Tips", value: monthlySummary.tips, color: "text-purple-400" },
                  { label: "Jobs", value: monthlySummary.jobs, color: "text-blue-400" },
                  { label: "Platform Fees Paid", value: monthlySummary.fees, color: "text-destructive" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-medium ${item.color}`}>{item.label === "Platform Fees Paid" ? "-" : ""}${item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex items-center justify-between text-sm font-semibold">
                  <span>Net Earnings</span>
                  <span className="text-[#00FF85]">${monthlySummary.net.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Payout Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Request Payout</SheetTitle>
          </SheetHeader>

          {payoutSubmitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-16 h-16 text-[#00FF85] mb-4" />
              <h3 className="text-xl font-bold mb-2">Request submitted</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Funds typically arrive within 2–3 business days after processing.</p>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              {/* Available balance */}
              <div className="p-4 rounded-xl bg-[#00FF85]/5 border border-[#00FF85]/20">
                <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-[#00FF85]">${available.toFixed(2)}</p>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-sm font-medium mb-2 block">Withdrawal Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                {amountError && <p className="text-xs text-destructive mt-1">{amountError}</p>}
              </div>

              {/* Payout method selector */}
              <div>
                <label className="text-sm font-medium mb-3 block">Payout Method</label>
                <div className="space-y-2">
                  {[
                    { icon: Building2, label: "Bank Transfer" },
                    { icon: CircleDollarSign, label: "PayPal" },
                    { icon: CreditCard, label: "Stripe Connect" },
                  ].map(method => (
                    <div key={method.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/20 opacity-60 cursor-not-allowed">
                      <method.icon className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{method.label}</p>
                        <p className="text-[10px] text-muted-foreground">Coming Soon — Connect in Settings</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">Soon</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleRequestPayout}
                disabled={!payoutAmount || Number(payoutAmount) <= 0 || Number(payoutAmount) > available || submitting}
                className="w-full bg-[#00FF85] hover:bg-[#00FF85]/90 text-black font-semibold"
              >
                {submitting ? "Submitting..." : "Request Payout"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
