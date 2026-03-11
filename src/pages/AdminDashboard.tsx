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
  TrendingUp, AlertTriangle, Eye
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
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
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("mux_live_streams").select("*", { count: "exact", head: true }),
        supabase.from("mux_live_streams").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("transactions").select("amount, created_at, type").order("created_at", { ascending: false }).limit(500),
        supabase.from("creator_spaces").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalRevenue = (revenueData || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

      // Build daily signups for last 14 days
      const days = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), "MMM d"));

      return {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalStreams: totalStreams || 0,
        activeStreams: activeStreams || 0,
        totalJobs: totalJobs || 0,
        pendingPayouts: pendingPayouts || 0,
        totalRevenue,
        totalSpaces: totalSpaces || 0,
        recentUsers: recentUsers || [],
        days,
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")}>
              <Users className="w-4 h-4 mr-1" /> Users
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/payouts")}>
              <DollarSign className="w-4 h-4 mr-1" /> Payouts
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
              <StatCard icon={DollarSign} label="Platform Revenue" value={`$${(stats?.totalRevenue || 0).toFixed(0)}`} />
              <StatCard icon={Package} label="Products" value={stats?.totalProducts} />
              <StatCard icon={Video} label="Total Streams" value={stats?.totalStreams} />
              <StatCard icon={Radio} label="Live Now" value={stats?.activeStreams} color="text-destructive" />
              <StatCard icon={TrendingUp} label="Creator Spaces" value={stats?.totalSpaces} />
              <StatCard icon={Eye} label="Open Jobs" value={stats?.totalJobs} />
              <StatCard
                icon={AlertTriangle}
                label="Pending Payouts"
                value={stats?.pendingPayouts}
                color={stats?.pendingPayouts ? "text-yellow-500" : "text-primary"}
              />
            </div>

            <Tabs defaultValue="users">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="users">Recent Users</TabsTrigger>
                <TabsTrigger value="activity">Platform Activity</TabsTrigger>
              </TabsList>

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

              <TabsContent value="activity">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Platform Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30 text-center">
                        <p className="text-2xl font-bold">{stats?.totalUsers}</p>
                        <p className="text-xs text-muted-foreground">Registered Users</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 text-center">
                        <p className="text-2xl font-bold">{stats?.totalProducts}</p>
                        <p className="text-xs text-muted-foreground">Products Created</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 text-center">
                        <p className="text-2xl font-bold">{stats?.totalSpaces}</p>
                        <p className="text-xs text-muted-foreground">Creator Spaces</p>
                      </div>
                    </div>
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
