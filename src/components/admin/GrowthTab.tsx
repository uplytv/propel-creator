import { AdminStatCard, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGrowth, DateRange } from "@/hooks/useAdminHealthData";
import { Users, TrendingUp, Zap, Target, Flame } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

export default function GrowthTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminGrowth(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Waitlist Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Users} label="Total Applicants" value={fmtInt(data.waitlistData.length)} />
        <AdminStatCard icon={TrendingUp} label="Referral Rate" value={pct(data.referralRate)} />
        <AdminStatCard icon={Flame} label="Viral Coefficient" value={data.viralCoefficient.toFixed(2)} />
        <AdminStatCard icon={Target} label="Creators Signed Up" value={fmtInt(data.profiles.length)} />
      </div>

      {data.viralCoefficient >= 1 && (
        <div className="px-4 py-2.5 rounded-lg border bg-primary/10 border-primary/30 text-primary text-sm">
          🔥 Viral growth! Coefficient is {data.viralCoefficient.toFixed(2)} — waitlist is growing itself
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Waitlist Signups</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.dailySignups.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Creators by Day</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.dailyCreators.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Waitlist → Creator Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Applied to Waitlist", value: data.funnel.applied },
              { label: "Granted Early Access", value: data.funnel.earlyAccess },
              { label: "Signed Up to Platform", value: data.funnel.signedUp },
              { label: "Created a Space", value: data.funnel.createdSpace },
              { label: "Got First Member", value: data.funnel.gotFirstMember },
              { label: "Got First Dollar", value: data.funnel.gotFirstDollar },
            ].map((step, i, arr) => {
              const prevValue = i > 0 ? arr[i - 1].value : step.value;
              const dropOff = prevValue > 0 ? ((prevValue - step.value) / prevValue) * 100 : 0;
              const width = data.funnel.applied > 0 ? Math.max(10, (step.value / data.funnel.applied) * 100) : 10;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{step.label}</span>
                    <span className="font-heading font-bold">{fmtInt(step.value)} {i > 0 && <span className="text-destructive text-xs ml-1">-{dropOff.toFixed(0)}%</span>}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Referrers */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top Referrers</CardTitle></CardHeader>
        <CardContent>
          {data.topReferrers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No referrers yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 px-2">Name</th>
                    <th className="py-2 px-2">Email</th>
                    <th className="py-2 px-2 text-right">Referrals</th>
                    <th className="py-2 px-2">Early Access</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReferrers.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium">{r.full_name}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">{r.email}</td>
                      <td className="py-2 px-2 text-right font-heading font-bold">{r.referral_count}</td>
                      <td className="py-2 px-2">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", r.early_access ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {r.early_access ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
