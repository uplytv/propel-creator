import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Users, DollarSign, Video, Package, Radio,
  TrendingUp, AlertTriangle, Eye, ToggleLeft, Link2, CreditCard, Zap, ClipboardList
} from "lucide-react";
import AdminWaitlistTab from "@/components/waitlist/AdminWaitlistTab";
import { format, subDays } from "date-fns";

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: any) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalProducts },
        { count: totalStreams },
        { count: activeStreams },
        { count: totalJobs },
        { count: pendingPayouts },
        { data: revenueData },
        { count: totalSpaces },
        { data: recentUsers },
        { count: activeSubscriptions },
        { data: tipData },
        { data: webhookLogs },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("mux_live_streams_public" as any).select("*", { count: "exact", head: true }),
        supabase.from("mux_live_streams_public" as any).select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("transactions").select("amount, platform_fee_amount, net_amount, created_at, type, status").order("created_at", { ascending: false }).limit(500),
        supabase.from("creator_spaces").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("member_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tip_transactions").select("amount").limit(1000),
        supabase.from("stripe_webhook_log" as any).select("id, event_type, stripe_event_id, status, created_at, error_message").order("created_at", { ascending: false }).limit(50),
      ]);

      const platformFees = (revenueData || []).reduce((sum: number, t: any) => sum + Number(t.platform_fee_amount || 0), 0);
      const creatorEarnings = (revenueData || []).reduce((sum: number, t: any) => sum + Number(t.net_amount || 0), 0);
      const totalTips = (tipData || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

      return {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalStreams: totalStreams || 0,
        activeStreams: activeStreams || 0,
        totalJobs: totalJobs || 0,
        pendingPayouts: pendingPayouts || 0,
        platformFees,
        creatorEarnings,
        totalSpaces: totalSpaces || 0,
        recentUsers: recentUsers || [],
        activeSubscriptions: activeSubscriptions || 0,
        totalTips,
        transactions: revenueData || [],
        webhookLogs: webhookLogs || [],
      };
    },
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-accent-green" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")}>
              <Users className="w-4 h-4 mr-1" /> Users
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/payouts")}>
              <DollarSign className="w-4 h-4 mr-1" /> Payouts
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/features")}>
              <ToggleLeft className="w-4 h-4 mr-1" /> Features
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/affiliates")}>
              <Link2 className="w-4 h-4 mr-1" /> Affiliates
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>
              Settings
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} />
              <StatCard icon={DollarSign} label="Platform Revenue" value={`$${(stats?.platformFees || 0).toFixed(2)}`} sub="5% platform fees" />
              <StatCard icon={CreditCard} label="Creator Earnings" value={`$${(stats?.creatorEarnings || 0).toFixed(2)}`} sub="95% to creators" />
              <StatCard icon={Users} label="Active Subscriptions" value={stats?.activeSubscriptions} />
              <StatCard icon={Zap} label="Tips Processed" value={`$${(stats?.totalTips || 0).toFixed(2)}`} />
              <StatCard icon={Radio} label="Live Now" value={stats?.activeStreams} color="text-destructive" />
              <StatCard icon={Package} label="Products" value={stats?.totalProducts} />
              <StatCard
                icon={AlertTriangle}
                label="Pending Payouts"
                value={stats?.pendingPayouts}
                color={stats?.pendingPayouts ? "text-yellow-500" : "text-primary"}
              />
            </div>

            <Tabs defaultValue="transactions">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="users">Recent Users</TabsTrigger>
                <TabsTrigger value="webhooks">Webhook Log</TabsTrigger>
                <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.transactions || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground text-left">
                              <th className="py-2 px-2">Date</th>
                              <th className="py-2 px-2">Type</th>
                              <th className="py-2 px-2 text-right">Amount</th>
                              <th className="py-2 px-2 text-right">Platform Fee</th>
                              <th className="py-2 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats?.transactions || []).slice(0, 20).map((t: any, i: number) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2 px-2 text-muted-foreground text-xs">{t.created_at ? format(new Date(t.created_at), "MMM d, h:mm a") : "—"}</td>
                                <td className="py-2 px-2"><Badge variant="outline" className="text-xs capitalize">{t.type || "—"}</Badge></td>
                                <td className="py-2 px-2 text-right font-medium">${Number(t.amount || 0).toFixed(2)}</td>
                                <td className="py-2 px-2 text-right text-muted-foreground">${Number(t.platform_fee_amount || 0).toFixed(2)}</td>
                                <td className="py-2 px-2">
                                  <Badge variant="outline" className={`text-xs border-0 ${t.status === "succeeded" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                    {t.status || "pending"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Latest Signups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(stats?.recentUsers || []).map((u: any) => (
                        <div key={u.user_id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {(u.display_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{u.display_name || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined {format(new Date(u.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate(`/creator/${u.user_id}`)}>
                            View
                          </Button>
                        </div>
                      ))}
                      {(stats?.recentUsers || []).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="webhooks">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Stripe Webhook Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.webhookLogs || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No webhook events logged yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground text-left">
                              <th className="py-2 px-2">Event</th>
                              <th className="py-2 px-2">Type</th>
                              <th className="py-2 px-2">Status</th>
                              <th className="py-2 px-2">Error</th>
                              <th className="py-2 px-2">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats?.webhookLogs || []).map((w: any) => (
                              <tr key={w.id} className="border-b border-border/50">
                                <td className="py-2 px-2 font-mono text-xs max-w-[100px] truncate">{w.stripe_event_id}</td>
                                <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{w.event_type}</Badge></td>
                                <td className="py-2 px-2">
                                  <Badge variant="outline" className={`text-xs border-0 ${w.status === "processed" ? "bg-primary/10 text-primary" : w.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                                    {w.status}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2 text-xs text-muted-foreground max-w-[150px] truncate">{w.error_message || "—"}</td>
                                <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(w.created_at), "MMM d, h:mm a")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
