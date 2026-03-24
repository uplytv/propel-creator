import { AdminStatCard, AdminAlerts, fmt, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOverview, DateRange } from "@/hooks/useAdminHealthData";
import { DollarSign, Users, BarChart3, TrendingUp, Zap, Activity, Target, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import LiveActivityFeed from "./LiveActivityFeed";
import DecisionsPanel from "./DecisionsPanel";
import AdminQuickActions from "./AdminQuickActions";

export default function OverviewTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminOverview(range);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const alerts = [];
  if (data.uptimeProxy < 95) alerts.push({ level: "critical" as const, message: `Webhook success rate at ${data.uptimeProxy.toFixed(0)}% — payments may be at risk` });
  if (data.activeCreators === 0) alerts.push({ level: "critical" as const, message: "Zero active creators in last 7 days — platform activity is stalled" });
  if (data.memberGrowth < -20) alerts.push({ level: "warning" as const, message: `Member growth declining at ${data.memberGrowth.toFixed(1)}% WoW` });
  if (data.activeCreators > 0 && data.revenueGrowth > 50) alerts.push({ level: "win" as const, message: `Revenue growing at ${data.revenueGrowth.toFixed(0)}% — strong momentum 🔥` });

  const revChange = data.prevRevenue > 0 ? ((data.totalRevenue - data.prevRevenue) / data.prevRevenue) * 100 : 0;
  const gmvChange = data.prevGmv > 0 ? ((data.gmv - data.prevGmv) / data.prevGmv) * 100 : 0;
  const memberChange = data.prevActiveMembers > 0 ? ((data.activeMembers - data.prevActiveMembers) / data.prevActiveMembers) * 100 : 0;

  const healthColor = data.healthScore >= 71 ? "text-primary" : data.healthScore >= 41 ? "text-warning" : "text-destructive";
  const healthLabel = data.healthScore >= 71 ? "Strong growth across key metrics" : data.healthScore >= 41 ? "Moderate growth — room for improvement" : "Critical metrics need attention";

  return (
    <div className="space-y-6">
      <AdminAlerts alerts={alerts} />

      {/* Quick Actions */}
      <AdminQuickActions />

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={DollarSign} label="Total Revenue" value={fmt(data.totalRevenue)} change={revChange} changePeriod="MoM" size="lg" />
        <AdminStatCard icon={Users} label="Active Creators" value={fmtInt(data.activeCreators)} change={data.creatorGrowth} changePeriod="WoW" size="lg" />
        <AdminStatCard icon={Heart} label="Active Members" value={fmtInt(data.activeMembers)} change={memberChange} changePeriod="WoW" size="lg" />
        <AdminStatCard icon={BarChart3} label="Platform GMV" value={fmt(data.gmv)} change={gmvChange} changePeriod="MoM" size="lg" />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Zap} label="Waitlist Applicants" value={fmtInt(data.waitlistCount)} />
        <AdminStatCard icon={Target} label="Conversion Rate" value={pct(data.conversionRate)} />
        <AdminStatCard icon={DollarSign} label="Platform Take (5%)" value={fmt(data.platformTake)} />
        <AdminStatCard icon={Activity} label="Net Revenue Retention" value={pct(data.retention)} />
      </div>

      {/* Health Score + Live Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Platform Health</p>
            <p className={cn("text-7xl font-heading font-extrabold tracking-tight", healthColor)}>
              {data.healthScore}
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">{healthLabel}</p>
          </CardContent>
        </Card>

        <LiveActivityFeed className="md:col-span-2" />
      </div>

      {/* Decisions Panel */}
      <DecisionsPanel range={range} />
    </div>
  );
}
