import { useEffect, useState } from "react";
import { Radio, TrendingUp, Award, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const PLATFORM_CONFIG: Record<string, { color: string; name: string }> = {
  youtube: { color: "#FF0000", name: "YouTube" },
  twitch: { color: "#9146FF", name: "Twitch" },
  kick: { color: "#53FC18", name: "Kick" },
};

interface SessionRow {
  platform: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export default function SimulcastAnalytics() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("stream_simulcast_sessions")
      .select("platform, status, started_at, ended_at, created_at")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setSessions((data as any[]) || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;

  const totalSessions = sessions.length;
  const successfulSessions = sessions.filter((s) => s.status !== "failed").length;
  const failedSessions = sessions.filter((s) => s.status === "failed").length;

  // Platform breakdown
  const platformStats: Record<string, { total: number; success: number; failed: number }> = {};
  sessions.forEach((s) => {
    if (!platformStats[s.platform]) platformStats[s.platform] = { total: 0, success: 0, failed: 0 };
    platformStats[s.platform].total++;
    if (s.status === "failed") platformStats[s.platform].failed++;
    else platformStats[s.platform].success++;
  });

  // Most reliable platform
  let mostReliable = "";
  let bestRate = -1;
  Object.entries(platformStats).forEach(([p, stats]) => {
    const rate = stats.total > 0 ? stats.success / stats.total : 0;
    if (rate > bestRate) { bestRate = rate; mostReliable = p; }
  });

  if (!totalSessions) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <Radio className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No simulcast sessions yet. Start streaming to multiple platforms!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sessions</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{totalSessions > 0 ? Math.round((successfulSessions / totalSessions) * 100) : 0}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Success Rate</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{PLATFORM_CONFIG[mostReliable]?.name || "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Most Reliable</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Platform Uptime
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(platformStats).map(([platform, stats]) => {
            const config = PLATFORM_CONFIG[platform];
            const uptime = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
            return (
              <div key={platform}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: config?.color }}>{config?.name || platform}</span>
                  <span className="text-xs text-muted-foreground">{uptime}% uptime · {stats.total} sessions</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${uptime}%`, backgroundColor: config?.color || "hsl(var(--primary))" }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Benchmark */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Industry Benchmark</p>
              <p className="text-xs text-muted-foreground mt-1">
                Creators who simulcast typically reach 40-60% more total viewers than single-platform streaming.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.slice(0, 20).map((s, i) => {
            const config = PLATFORM_CONFIG[s.platform];
            const duration = s.started_at && s.ended_at
              ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
              : null;
            return (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-xs">
                <div className="flex items-center gap-2">
                  <span style={{ color: config?.color }}>{config?.name || s.platform}</span>
                  <span className={s.status === "failed" ? "text-destructive" : "text-green-400"}>
                    {s.status === "failed" ? "✗" : "✓"}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {duration ? `${duration}m` : "—"} · {format(new Date(s.created_at), "MMM d")}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
