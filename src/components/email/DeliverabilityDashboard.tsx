import { useMemo } from "react";
import { ShieldCheck, AlertTriangle, Ban, TrendingDown, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliverabilityDashboard() {
  const { user } = useAuth();

  const { data: broadcasts = [], isLoading, refetch } = useQuery({
    queryKey: ["deliverability-data", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_broadcasts")
        .select("id, total_recipients, delivered_count, failed_count, bounce_count, complaint_count, open_count, sent_at")
        .eq("creator_id", user!.id)
        .in("status", ["sent", "sending"])
        .order("sent_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: suppressedCount = 0 } = useQuery({
    queryKey: ["suppressed-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("suppressed_emails")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const metrics = useMemo(() => {
    const totalSent = broadcasts.reduce((a, b) => a + (b.delivered_count || 0), 0);
    const totalFailed = broadcasts.reduce((a, b) => a + (b.failed_count || 0), 0);
    const totalBounces = broadcasts.reduce((a, b) => a + (b.bounce_count || 0), 0);
    const totalComplaints = broadcasts.reduce((a, b) => a + (b.complaint_count || 0), 0);
    const totalAttempted = totalSent + totalFailed;
    const deliveryRate = totalAttempted > 0 ? (totalSent / totalAttempted * 100) : 100;
    const bounceRate = totalAttempted > 0 ? (totalBounces / totalAttempted * 100) : 0;
    const complaintRate = totalSent > 0 ? (totalComplaints / totalSent * 100) : 0;

    // Health score: starts at 100, penalize for bounces and complaints
    let health = 100;
    if (bounceRate > 5) health -= 30;
    else if (bounceRate > 2) health -= 15;
    else if (bounceRate > 0.5) health -= 5;
    if (complaintRate > 0.3) health -= 30;
    else if (complaintRate > 0.1) health -= 15;
    else if (complaintRate > 0) health -= 5;
    if (totalFailed > totalSent * 0.1) health -= 10;
    health = Math.max(0, health);

    return { totalSent, totalFailed, totalBounces, totalComplaints, deliveryRate, bounceRate, complaintRate, health };
  }, [broadcasts]);

  const healthColor = metrics.health >= 80 ? "#3D7CFF" : metrics.health >= 50 ? "#f59e0b" : "#ef4444";
  const healthLabel = metrics.health >= 80 ? "Excellent" : metrics.health >= 50 ? "Needs Attention" : "Critical";

  if (isLoading) return <Skeleton className="h-40 rounded-xl mx-4" />;

  return (
    <div className="mx-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Deliverability Health
        </h3>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* Health Score */}
      <div className="p-4 rounded-xl border border-border bg-card text-center">
        <div className="text-4xl font-bold mb-1" style={{ color: healthColor }}>{metrics.health}</div>
        <Badge className="text-[10px]" style={{ background: `${healthColor}20`, color: healthColor }}>{healthLabel}</Badge>
        <p className="text-[10px] text-muted-foreground mt-1">Sender Reputation Score</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={ShieldCheck}
          label="Delivery Rate"
          value={`${metrics.deliveryRate.toFixed(1)}%`}
          color={metrics.deliveryRate >= 95 ? "#3D7CFF" : metrics.deliveryRate >= 90 ? "#f59e0b" : "#ef4444"}
        />
        <MetricCard
          icon={TrendingDown}
          label="Bounce Rate"
          value={`${metrics.bounceRate.toFixed(2)}%`}
          color={metrics.bounceRate <= 2 ? "#3D7CFF" : metrics.bounceRate <= 5 ? "#f59e0b" : "#ef4444"}
          warn={metrics.bounceRate > 2}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Complaint Rate"
          value={`${metrics.complaintRate.toFixed(3)}%`}
          color={metrics.complaintRate <= 0.1 ? "#3D7CFF" : metrics.complaintRate <= 0.3 ? "#f59e0b" : "#ef4444"}
          warn={metrics.complaintRate > 0.1}
        />
        <MetricCard
          icon={Ban}
          label="Suppressed"
          value={suppressedCount.toString()}
          color={suppressedCount > 0 ? "#f59e0b" : "#3D7CFF"}
        />
      </div>

      {/* Warnings */}
      {metrics.bounceRate > 2 && (
        <div className="p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>High bounce rate.</strong> Clean your list by removing invalid emails. Consider verifying emails before adding.
          </div>
        </div>
      )}
      {metrics.complaintRate > 0.1 && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-xs text-red-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Complaint rate is elevated.</strong> Ensure you're only emailing opted-in subscribers and provide easy unsubscribe options.
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, warn }: {
  icon: any; label: string; value: string; color: string; warn?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl border border-border bg-card">
      <Icon className="w-3.5 h-3.5 mb-1 text-muted-foreground" />
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        {label}
        {warn && <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />}
      </div>
    </div>
  );
}
