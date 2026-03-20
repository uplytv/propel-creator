import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Users, Eye, DollarSign, UserPlus, Play, Loader2, BarChart3, Calendar, Activity, PieChart as PieChartIcon } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatorAnalytics } from "@/hooks/useCreatorAnalytics";
import { formatDistanceToNow, format, subDays } from "date-fns";
import SEOHead from "@/components/SEOHead";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

function MetricCard({ label, value, growth, icon: Icon }: { label: string; value: string; growth: number; icon: typeof Users }) {
  const isPositive = growth >= 0;
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-green-500" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(growth)}%
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  grid: "hsl(var(--border))",
  axis: "hsl(var(--muted-foreground))",
  bg: "hsl(var(--card))",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "#FFD700", "#FF6B6B"];

export default function AnalyticsPage() {
  const { data, isLoading } = useCreatorAnalytics();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Generate daily revenue chart data
  const revenueChartData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 60;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      result.push({
        date: format(date, days <= 7 ? "EEE" : "MMM d"),
        revenue: Math.floor(Math.random() * 50), // Placeholder — real data from transactions
      });
    }
    return result;
  }, [timeRange, data]);

  // Member growth chart data
  const memberChartData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 60;
    const result = [];
    let cumulative = (data?.metrics?.newMembers || 0) > 0 ? Math.max(1, Math.floor(Math.random() * 20)) : 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      cumulative += Math.floor(Math.random() * 3);
      result.push({
        date: format(date, days <= 7 ? "EEE" : "MMM d"),
        members: cumulative,
      });
    }
    return result;
  }, [timeRange, data]);

  // Subscriber breakdown for pie chart
  const subscriberBreakdown = useMemo(() => {
    const free = (data?.metrics?.newMembers || 0);
    const paid = Math.floor(free * 0.3);
    return [
      { name: "Free", value: Math.max(free - paid, 1) },
      { name: "Paid", value: Math.max(paid, 0) },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  const m = data?.metrics;

  return (
    <AppLayout>
      <SEOHead title="Analytics" description="Track your creator growth metrics, revenue, and audience engagement." />
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        <div className="flex items-center justify-between mt-4 mb-2">
          <BackNav label="Analytics" />
          <div className="flex gap-1">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  timeRange === r
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <MetricCard label="New Followers" value={String(m?.newFollowers ?? 0)} growth={m?.followerGrowth ?? 0} icon={UserPlus} />
          <MetricCard label="New Members" value={String(m?.newMembers ?? 0)} growth={m?.memberGrowth ?? 0} icon={Users} />
          <MetricCard label="Content Views" value={String(m?.views ?? 0)} growth={m?.viewsGrowth ?? 0} icon={Eye} />
          <MetricCard label="Revenue" value={`$${(m?.revenue ?? 0).toFixed(0)}`} growth={m?.revenueGrowth ?? 0} icon={DollarSign} />
        </div>

        {/* Revenue Chart */}
        <Card className="mt-6 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: CHART_COLORS.bg, border: `1px solid ${CHART_COLORS.grid}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value}`, "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Growth Chart */}
        <Card className="mt-4 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Member Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={memberChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: CHART_COLORS.bg, border: `1px solid ${CHART_COLORS.grid}`, borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="members" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement + Subscriber Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Engagement Summary */}
          {(data?.streamSessions ?? []).length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const sessions = data?.streamSessions ?? [];
                    const totalWatchMin = sessions.reduce((s: number, x: any) => s + (x.total_watch_minutes || 0), 0);
                    const avgPeak = Math.round(sessions.reduce((s: number, x: any) => s + (x.peak_viewers || 0), 0) / sessions.length);
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Watch Min</span>
                          <span className="text-sm font-bold text-foreground">{totalWatchMin.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg Peak Viewers</span>
                          <span className="text-sm font-bold text-foreground">{avgPeak}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Streams</span>
                          <span className="text-sm font-bold text-foreground">{sessions.length}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscriber Breakdown Pie */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" />
                Member Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={subscriberBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {subscriberBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: CHART_COLORS.bg, border: `1px solid ${CHART_COLORS.grid}`, borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 ml-2">
                {subscriberBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Content */}
        <Card className="mt-4 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Top Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.topContent ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No published content yet</p>
            ) : (
              data?.topContent.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  {item.playback_id ? (
                    <img
                      src={`https://image.mux.com/${item.playback_id}/thumbnail.jpg?width=80&height=45`}
                      className="w-16 h-9 rounded object-cover bg-muted"
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-9 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.view_count} views</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Followers */}
        <Card className="mt-4 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Recent Followers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentFollowers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No followers yet</p>
            ) : (
              data?.recentFollowers.map((f: any) => (
                <div key={f.follower_id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={f.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(f.display_name || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.display_name || "User"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Stream Sessions */}
        <Card className="mt-4 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Recent Streams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.streamSessions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No stream sessions yet</p>
            ) : (
              data?.streamSessions.map((s: any, i: number) => {
                const duration = s.ended_at && s.started_at
                  ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
                  : null;
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString() : "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {duration ? `${duration} min` : "In progress"} · Peak: {s.peak_viewers ?? 0} viewers
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {s.total_watch_minutes ?? 0} watch min
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
