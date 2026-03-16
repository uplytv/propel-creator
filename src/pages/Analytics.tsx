import { useMemo } from "react";
import { TrendingUp, TrendingDown, Users, Eye, DollarSign, UserPlus, Play, Loader2, BarChart3, Calendar, Activity } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatorAnalytics } from "@/hooks/useCreatorAnalytics";
import { formatDistanceToNow } from "date-fns";
import SEOHead from "@/components/SEOHead";

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
        <p className="text-xs text-muted-foreground mt-0.5">{label} · Last 30 days</p>
      </CardContent>
    </Card>
  );
}

/** Simple bar chart using divs — no charting lib needed */
function MiniBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-28">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground font-medium">{d.value}</span>
              <div
                className="w-full rounded-t bg-primary/70 transition-all duration-500"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RetentionIndicator({ sessions }: { sessions: any[] }) {
  const stats = useMemo(() => {
    if (!sessions.length) return null;
    const totalWatchMin = sessions.reduce((s, x) => s + (x.total_watch_minutes || 0), 0);
    const avgPeakViewers = Math.round(sessions.reduce((s, x) => s + (x.peak_viewers || 0), 0) / sessions.length);
    const avgDuration = sessions.reduce((s, x) => {
      if (!x.started_at || !x.ended_at) return s;
      return s + (new Date(x.ended_at).getTime() - new Date(x.started_at).getTime()) / 60000;
    }, 0) / sessions.length;
    return { totalWatchMin, avgPeakViewers, avgDuration: Math.round(avgDuration) };
  }, [sessions]);

  if (!stats) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Engagement Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.totalWatchMin.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Total Watch Min</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.avgPeakViewers}</p>
            <p className="text-[11px] text-muted-foreground">Avg Peak Viewers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.avgDuration}m</p>
            <p className="text-[11px] text-muted-foreground">Avg Stream Length</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useCreatorAnalytics();

  // Build weekly follower data from stream sessions for the chart
  const weeklyData = useMemo(() => {
    const weeks: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = `W${4 - i}`;
      // Count streams in this week
      const count = (data?.streamSessions ?? []).filter((s: any) => {
        if (!s.started_at) return false;
        const d = new Date(s.started_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ label, value: count });
    }
    return weeks;
  }, [data?.streamSessions]);

  const revenueChartData = useMemo(() => {
    // Simple breakdown: show revenue as a single bar vs previous period
    const m = data?.metrics;
    if (!m) return [];
    const prev = m.revenueGrowth !== 0 && m.revenue > 0
      ? Math.round(m.revenue / (1 + m.revenueGrowth / 100))
      : 0;
    return [
      { label: "Prev 30d", value: prev },
      { label: "Last 30d", value: m.revenue },
    ];
  }, [data?.metrics]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const m = data?.metrics;

  return (
    <AppLayout>
      <SEOHead title="Analytics" description="Track your creator growth metrics, revenue, and audience engagement." />
      <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Analytics" />

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <MetricCard label="New Followers" value={String(m?.newFollowers ?? 0)} growth={m?.followerGrowth ?? 0} icon={UserPlus} />
          <MetricCard label="New Members" value={String(m?.newMembers ?? 0)} growth={m?.memberGrowth ?? 0} icon={Users} />
          <MetricCard label="Content Views" value={String(m?.views ?? 0)} growth={m?.viewsGrowth ?? 0} icon={Eye} />
          <MetricCard label="Revenue" value={`$${(m?.revenue ?? 0).toFixed(0)}`} growth={m?.revenueGrowth ?? 0} icon={DollarSign} />
        </div>

        {/* Engagement Summary */}
        {(data?.streamSessions ?? []).length > 0 && (
          <div className="mt-4">
            <RetentionIndicator sessions={data?.streamSessions ?? []} />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <MiniBarChart data={weeklyData} label="Streams per Week" />
          {revenueChartData.length > 0 && (
            <MiniBarChart data={revenueChartData} label="Revenue Trend" />
          )}
        </div>

        {/* Top Content */}
        <Card className="mt-6 border-border">
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
