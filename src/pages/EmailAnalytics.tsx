import { useMemo } from "react";
import { BarChart3, Eye, MousePointerClick, Users, TrendingUp, Mail } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import DeliverabilityDashboard from "@/components/email/DeliverabilityDashboard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function EmailAnalytics() {
  const { user } = useAuth();

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["email-analytics-broadcasts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_broadcasts")
        .select("id, subject, status, sent_at, created_at, total_recipients, delivered_count, failed_count, open_count, click_count, bounce_count, complaint_count, ab_variant_a, ab_variant_b, ab_parent_id")
        .eq("creator_id", user!.id)
        .in("status", ["sent", "sending"])
        .order("sent_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const stats = useMemo(() => {
    const sent = broadcasts.filter(b => !b.ab_parent_id);
    const totalSent = sent.reduce((a, b) => a + (b.delivered_count || 0), 0);
    const totalOpens = sent.reduce((a, b) => a + (b.open_count || 0), 0);
    const totalClicks = sent.reduce((a, b) => a + (b.click_count || 0), 0);
    const totalRecipients = sent.reduce((a, b) => a + (b.total_recipients || 0), 0);
    const avgOpenRate = totalRecipients > 0 ? (totalOpens / totalRecipients * 100) : 0;
    const avgClickRate = totalOpens > 0 ? (totalClicks / totalOpens * 100) : 0;
    return { totalSent, totalOpens, totalClicks, avgOpenRate, avgClickRate, broadcastCount: sent.length };
  }, [broadcasts]);

  const chartData = useMemo(() => {
    const days: { date: string; sends: number; opens: number; clicks: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayStr = format(day, "yyyy-MM-dd");
      const dayBroadcasts = broadcasts.filter(b => {
        if (b.ab_parent_id) return false;
        const d = b.sent_at || b.created_at;
        return d && format(new Date(d), "yyyy-MM-dd") === dayStr;
      });
      days.push({
        date: format(day, "MMM d"),
        sends: dayBroadcasts.reduce((a, b) => a + (b.delivered_count || 0), 0),
        opens: dayBroadcasts.reduce((a, b) => a + (b.open_count || 0), 0),
        clicks: dayBroadcasts.reduce((a, b) => a + (b.click_count || 0), 0),
      });
    }
    return days;
  }, [broadcasts]);

  const broadcastPerf = useMemo(() => {
    return broadcasts
      .filter(b => !b.ab_parent_id && b.total_recipients)
      .slice(0, 10)
      .map(b => ({
        subject: b.subject?.substring(0, 30) || "—",
        openRate: b.total_recipients ? Math.round((b.open_count || 0) / b.total_recipients * 100) : 0,
        clickRate: b.open_count ? Math.round((b.click_count || 0) / b.open_count * 100) : 0,
        recipients: b.total_recipients,
        isAB: !!(b.ab_variant_a && b.ab_variant_b),
      }));
  }, [broadcasts]);

  return (
    <AppLayout>
      <SEOHead title="Email Analytics | UPLY" description="Track email engagement" />
      <div className="min-h-screen pb-24">
        <BackNav label="Email Analytics" />

        {isLoading ? (
          <div className="px-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Deliverability Health */}
            <DeliverabilityDashboard />

            {/* Summary Stats */}
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <StatCard icon={Mail} label="Broadcasts" value={stats.broadcastCount} />
              <StatCard icon={Users} label="Total Delivered" value={stats.totalSent} />
              <StatCard icon={Eye} label="Avg Open Rate" value={`${stats.avgOpenRate.toFixed(1)}%`} accent />
              <StatCard icon={MousePointerClick} label="Avg Click Rate" value={`${stats.avgClickRate.toFixed(1)}%`} accent />
            </div>

            {/* Engagement Trend */}
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 30-Day Engagement
              </h3>
              <div className="rounded-xl border border-border bg-card p-3" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3D7CFF" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3D7CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} interval={6} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Area type="monotone" dataKey="opens" stroke="#3b82f6" fill="url(#openGrad)" strokeWidth={2} name="Opens" />
                    <Area type="monotone" dataKey="clicks" stroke="#3D7CFF" fill="url(#clickGrad)" strokeWidth={2} name="Clicks" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-Broadcast Performance */}
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Broadcast Performance
              </h3>
              {broadcastPerf.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No broadcast data yet</p>
              ) : (
                <div className="rounded-xl border border-border bg-card p-3" style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={broadcastPerf} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} unit="%" />
                      <YAxis type="category" dataKey="subject" tick={{ fontSize: 10, fill: '#999' }} width={100} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 12, fontSize: 12 }}
                        formatter={(v: number, name: string) => [`${v}%`, name]}
                      />
                      <Bar dataKey="openRate" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Open Rate" />
                      <Bar dataKey="clickRate" fill="#3D7CFF" radius={[0, 4, 4, 0]} name="Click Rate" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent Broadcasts Table */}
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Broadcasts</h3>
              <div className="space-y-2">
                {broadcasts.filter(b => !b.ab_parent_id).slice(0, 10).map(b => (
                  <div key={b.id} className="p-3 rounded-xl border border-border bg-card">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-foreground truncate flex-1">{b.subject}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                        {b.sent_at ? format(new Date(b.sent_at), "MMM d") : "—"}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span><Users className="w-3 h-3 inline mr-0.5" />{b.total_recipients || 0}</span>
                      <span className="text-blue-400"><Eye className="w-3 h-3 inline mr-0.5" />{b.open_count || 0} ({b.total_recipients ? Math.round((b.open_count || 0) / b.total_recipients * 100) : 0}%)</span>
                      <span style={{ color: "#3D7CFF" }}><MousePointerClick className="w-3 h-3 inline mr-0.5" />{b.click_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl p-4 border border-border bg-card">
      <Icon className="w-4 h-4 mb-1 text-muted-foreground" />
      <div className={`text-xl font-bold ${accent ? '' : 'text-foreground'}`} style={accent ? { color: '#3D7CFF' } : undefined}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
