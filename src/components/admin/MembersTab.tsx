import { AdminStatCard, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMembers, DateRange } from "@/hooks/useAdminHealthData";
import { Users, UserMinus, TrendingUp, Heart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

export default function MembersTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminMembers(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {data.churnRate > 10 && (
        <div className="px-4 py-2.5 rounded-lg border bg-warning/10 border-warning/30 text-warning text-sm">
          🟡 Member churn rate at {data.churnRate.toFixed(1)}% — above 10% industry benchmark
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Users} label="Total Members" value={fmtInt(data.totalMembers)} size="lg" />
        <AdminStatCard icon={Heart} label="Active Subscriptions" value={fmtInt(data.activeSubs)} />
        <AdminStatCard icon={UserMinus} label="Churn Rate" value={pct(data.churnRate)} />
        <AdminStatCard icon={TrendingUp} label="Avg Subs/Member" value={data.avgSubsPerMember.toFixed(1)} />
      </div>

      {data.avgSubsPerMember >= 1.5 && (
        <div className="px-4 py-2.5 rounded-lg border bg-primary/10 border-primary/30 text-primary text-sm">
          🟢 Avg {data.avgSubsPerMember.toFixed(1)} subscriptions per member — members are discovering multiple creators
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">New Members by Day</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyNew.slice(-30)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
