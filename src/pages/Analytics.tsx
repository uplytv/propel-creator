import { TrendingUp, TrendingDown, Users, Eye, DollarSign, UserPlus, Play, Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatorAnalytics } from "@/hooks/useCreatorAnalytics";
import { formatDistanceToNow } from "date-fns";

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

export default function AnalyticsPage() {
  const { data, isLoading } = useCreatorAnalytics();

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
      <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
        <BackNav title="Analytics" />

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <MetricCard label="New Followers" value={String(m?.newFollowers ?? 0)} growth={m?.followerGrowth ?? 0} icon={UserPlus} />
          <MetricCard label="New Members" value={String(m?.newMembers ?? 0)} growth={m?.memberGrowth ?? 0} icon={Users} />
          <MetricCard label="Content Views" value={String(m?.views ?? 0)} growth={m?.viewsGrowth ?? 0} icon={Eye} />
          <MetricCard label="Revenue" value={`$${(m?.revenue ?? 0).toFixed(0)}`} growth={m?.revenueGrowth ?? 0} icon={DollarSign} />
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
              <Eye className="w-4 h-4 text-primary" />
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
