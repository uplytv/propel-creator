import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { Mail, MousePointerClick, Sparkles } from "lucide-react";

interface Props { linkId: string; }

interface Click { platform: string | null; clicked_at: string; }

export default function SmartLinkAnalytics({ linkId }: Props) {
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [emailCount, setEmailCount] = useState(0);
  const [presaveCount, setPresaveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [clicksRes, emailsRes, presavesRes] = await Promise.all([
        supabase.from("smart_link_clicks").select("platform, clicked_at").eq("link_id", linkId).order("clicked_at", { ascending: false }).limit(1000),
        supabase.from("smart_link_email_captures").select("id", { count: "exact", head: true }).eq("link_id", linkId),
        supabase.from("smart_link_presaves").select("id", { count: "exact", head: true }).eq("link_id", linkId),
      ]);
      if (cancelled) return;
      setClicks((clicksRes.data || []) as Click[]);
      setEmailCount(emailsRes.count || 0);
      setPresaveCount(presavesRes.count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [linkId]);

  if (loading) {
    return (
      <div className="space-y-3 mt-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Aggregate by platform
  const platformCounts: Record<string, number> = {};
  clicks.forEach((c) => {
    const k = c.platform || "view";
    platformCounts[k] = (platformCounts[k] || 0) + 1;
  });
  const platformData = Object.entries(platformCounts)
    .filter(([k]) => k !== "view")
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate by day
  const dayCounts: Record<string, number> = {};
  clicks.forEach((c) => {
    const day = c.clicked_at.slice(0, 10);
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const dayData = Object.entries(dayCounts)
    .map(([date, count]) => ({ date: date.slice(5), count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const totalClicks = clicks.filter((c) => c.platform !== "view").length;
  const totalViews = clicks.filter((c) => c.platform === "view").length;

  return (
    <div className="space-y-4 mt-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><MousePointerClick className="h-3 w-3" />Clicks</div>
          <p className="text-2xl font-bold mt-1">{totalClicks}</p>
          <p className="text-xs text-muted-foreground">{totalViews} views</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Sparkles className="h-3 w-3" />Pre-saves</div>
          <p className="text-2xl font-bold mt-1">{presaveCount}</p>
        </Card>
        <Card className="p-4 col-span-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Mail className="h-3 w-3" />Emails captured</div>
          <p className="text-2xl font-bold mt-1">{emailCount}</p>
        </Card>
      </div>

      {dayData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Views over time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dayData}>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {platformData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Clicks by platform</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, platformData.length * 32)}>
            <BarChart data={platformData} layout="vertical">
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis type="category" dataKey="platform" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {totalClicks === 0 && presaveCount === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No activity yet. Share your link to start tracking.
        </Card>
      )}
    </div>
  );
}
