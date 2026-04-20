import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Eye, MousePointerClick } from "lucide-react";

/**
 * Per-creator dashboard widget: shows discovery score, watch %, impressions,
 * CTR, and which content is being boosted by the algorithm.
 */
export default function DiscoveryInsights() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["discovery-insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("video_discovery_scores")
        .select("*")
        .eq("creator_id", user!.id)
        .order("score", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (isLoading) return <Card className="p-6">Loading discovery insights…</Card>;

  if (data.length === 0) {
    return (
      <Card className="p-6 text-center">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Upload your first video to enter the discovery feed.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Discovery insights</h3>
        <span className="text-xs text-muted-foreground">Updated every 30 min</span>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.map((row: any) => {
          const ctr = row.impressions > 0 ? ((row.feed_clicks / row.impressions) * 100).toFixed(1) : "—";
          return (
            <div key={row.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{row.content_type}</span>
                  {row.is_new_creator_boosted && (
                    <Badge className="gap-1 bg-primary/20 text-primary border-primary/30"><Sparkles className="w-3 h-3" /> 1.5× boost</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">Category: {row.category}</div>
              </div>
              <div className="text-right text-xs grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span className="text-muted-foreground">Score</span><span className="font-mono">{Number(row.score).toFixed(2)}</span>
                <span className="text-muted-foreground">Watch %</span><span className="font-mono">{Number(row.watch_time_avg_pct).toFixed(0)}%</span>
                <span className="text-muted-foreground"><Eye className="inline w-3 h-3" /></span><span className="font-mono">{row.views}</span>
                <span className="text-muted-foreground"><MousePointerClick className="inline w-3 h-3" /></span><span className="font-mono">{ctr}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
