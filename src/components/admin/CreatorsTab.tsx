import { AdminStatCard, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCreators, DateRange } from "@/hooks/useAdminHealthData";
import { Users, UserCheck, UserX, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["hsl(145,100%,50%)", "hsl(200,80%,55%)", "hsl(45,93%,47%)", "hsl(0,84%,55%)", "hsl(280,70%,55%)", "hsl(170,60%,45%)", "hsl(30,90%,55%)", "hsl(320,70%,50%)", "hsl(100,60%,40%)"];

export default function CreatorsTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminCreators(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const npsScore = data.total > 0 ? Math.round(((data.promoters - data.detractors) / data.total) * 100) : 0;
  const typeData = Object.entries(data.byType).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Users} label="Total Creators" value={fmtInt(data.total)} size="lg" />
        <AdminStatCard icon={UserCheck} label="Active (30d)" value={fmtInt(data.active)} />
        <AdminStatCard icon={UserX} label="Dormant (30d+)" value={fmtInt(data.dormant)} />
        <AdminStatCard icon={BarChart3} label="NPS Proxy" value={npsScore} />
      </div>

      {/* NPS breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Promoters (10+)</p>
          <p className="text-lg font-heading font-bold text-primary">{data.promoters}</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Passives (1-9)</p>
          <p className="text-lg font-heading font-bold text-warning">{data.passives}</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Detractors (0)</p>
          <p className="text-lg font-heading font-bold text-destructive">{data.detractors}</p>
        </CardContent></Card>
      </div>

      {/* Creator by Type Pie */}
      {typeData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Creators by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Creator Leaderboard</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Creator</th>
                  <th className="py-2 px-2 text-right">Members</th>
                  <th className="py-2 px-2 text-right">Revenue</th>
                  <th className="py-2 px-2 text-right">Activity</th>
                  <th className="py-2 px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.slice(0, 20).map((c: any, i: number) => (
                  <tr key={c.user_id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-heading font-bold text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(c.display_name || "?")[0].toUpperCase()}
                        </div>
                        <span className="font-medium truncate max-w-[120px]">{c.display_name || "Anonymous"}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">{c.memberCount}</td>
                    <td className="py-2 px-2 text-right font-heading">${Number(c.total_revenue || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right">{c.activity}</td>
                    <td className="py-2 px-2 text-right font-heading font-bold">{c.score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.leaderboard.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No creators yet</p>}
        </CardContent>
      </Card>

      {/* Dormant Creators */}
      {data.dormantList.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-warning">Dormant Creators (No Activity 30d+)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.dormantList.map((c: any) => (
                <div key={c.user_id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{(c.display_name || "?")[0]}</div>
                    <span className="text-sm">{c.display_name || "Anonymous"}</span>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{c.creator_type || "unknown"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
