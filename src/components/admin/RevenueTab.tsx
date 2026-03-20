import { AdminStatCard, fmt, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRevenue, DateRange } from "@/hooks/useAdminHealthData";
import { DollarSign, TrendingUp, CreditCard, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";

export default function RevenueTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminRevenue(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const totalGmv = data.dailyRevenue.reduce((s, d) => s + d.gmv, 0);
  const totalPlatform = data.dailyRevenue.reduce((s, d) => s + d.platform, 0);

  return (
    <div className="space-y-6">
      {data.webhookFailRate > 5 && (
        <div className="px-4 py-2.5 rounded-lg border bg-destructive/10 border-destructive/30 text-destructive text-sm">
          ⚠️ Stripe webhook failure rate at {data.webhookFailRate.toFixed(1)}% — {data.webhookFailed.length} failed in recent period
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={DollarSign} label="Total GMV" value={fmt(totalGmv)} size="lg" />
        <AdminStatCard icon={TrendingUp} label="Platform Revenue (5%)" value={fmt(totalPlatform)} size="lg" />
        <AdminStatCard icon={DollarSign} label="Tips" value={fmt(data.totalTips)} />
        <AdminStatCard icon={DollarSign} label="Live Purchases" value={fmt(data.totalLive)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={DollarSign} label="Ticket Sales" value={fmt(data.totalTickets)} />
        <AdminStatCard icon={CreditCard} label="Stripe Active" value={fmtInt(data.stripeActive)} />
        <AdminStatCard icon={CreditCard} label="Stripe Pending" value={fmtInt(data.stripePending)} />
        <AdminStatCard icon={AlertTriangle} label="Webhook Success" value={pct(100 - data.webhookFailRate)} />
      </div>

      {/* GMV vs Platform Revenue Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">GMV vs Platform Revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyRevenue.slice(-30)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="gmv" name="GMV" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="platform" name="Platform Take" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Type */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Stream</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.byType).sort((a, b) => b[1] - a[1]).map(([type, amount]) => (
              <div key={type} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{type}</Badge>
                </div>
                <span className="font-heading font-bold">{fmt(amount)}</span>
              </div>
            ))}
            {Object.keys(data.byType).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Failed Webhooks */}
      {data.webhookFailed.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Failed Webhooks</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 px-2">Event</th>
                    <th className="py-2 px-2">Error</th>
                    <th className="py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.webhookFailed.slice(0, 10).map((w: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{w.event_type}</Badge></td>
                      <td className="py-2 px-2 text-xs text-destructive max-w-[200px] truncate">{w.error_message || "Unknown"}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(w.created_at), "MMM d, h:mm a")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
