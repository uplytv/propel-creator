import { AdminStatCard, fmtInt, pct } from "./AdminShared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminContent, DateRange } from "@/hooks/useAdminHealthData";
import { Video, Radio, BookOpen, MessageSquare, Eye, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ContentTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useAdminContent(range);

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const categoryData = Object.entries(data.byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Live Streaming */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Streaming</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Radio} label="Total Streams" value={fmtInt(data.streams)} />
        <AdminStatCard icon={Clock} label="Avg Duration" value={`${data.avgDuration.toFixed(0)}m`} />
        <AdminStatCard icon={Eye} label="Avg Peak Viewers" value={data.avgPeakViewers.toFixed(0)} />
        <AdminStatCard icon={Radio} label="Total Stream Hours" value={`${data.totalHours.toFixed(1)}h`} />
      </div>

      {data.avgDuration > 0 && data.avgDuration < 10 && (
        <div className="px-4 py-2.5 rounded-lg border bg-warning/10 border-warning/30 text-warning text-sm">
          🟡 Average stream duration is {data.avgDuration.toFixed(0)} minutes — creators may be going live briefly and leaving
        </div>
      )}

      {categoryData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Streams by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Video Content */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Video Content</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={Video} label="Videos Uploaded" value={fmtInt(data.videos)} />
        <AdminStatCard icon={Eye} label="Total Views" value={fmtInt(data.totalViews)} />
        <AdminStatCard icon={Eye} label="Avg Views/Video" value={data.avgViews.toFixed(0)} />
        <AdminStatCard icon={Video} label="Clips Created" value={fmtInt(data.clips)} />
      </div>

      {/* Top Videos */}
      {data.topVideos.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Videos by Views</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 px-2">Title</th>
                    <th className="py-2 px-2 text-right">Views</th>
                    <th className="py-2 px-2 text-right">Likes</th>
                    <th className="py-2 px-2 text-right">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topVideos.map((v: any) => (
                    <tr key={v.id} className="border-b border-border/50">
                      <td className="py-2 px-2 truncate max-w-[200px]">{v.title || "Untitled"}</td>
                      <td className="py-2 px-2 text-right font-heading font-bold">{fmtInt(v.view_count || 0)}</td>
                      <td className="py-2 px-2 text-right">{v.like_count || 0}</td>
                      <td className="py-2 px-2 text-right">{v.comment_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Community Content */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Community Content</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={MessageSquare} label="Total Posts" value={fmtInt(data.posts)} />
        <AdminStatCard icon={MessageSquare} label="Total Comments" value={fmtInt(data.comments)} />
        <AdminStatCard icon={MessageSquare} label="Total Likes" value={fmtInt(data.postLikes)} />
        <AdminStatCard icon={MessageSquare} label="Avg Engagement/Post" value={data.avgEngagement.toFixed(1)} />
      </div>

      {/* Courses */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Courses</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard icon={BookOpen} label="Modules" value={fmtInt(data.modules)} />
        <AdminStatCard icon={BookOpen} label="Lessons" value={fmtInt(data.lessons)} />
        <AdminStatCard icon={BookOpen} label="Completions" value={fmtInt(data.completions)} />
        <AdminStatCard icon={BookOpen} label="Completion Rate" value={data.lessons > 0 ? pct((data.completions / data.lessons) * 100) : "—"} />
      </div>
    </div>
  );
}
