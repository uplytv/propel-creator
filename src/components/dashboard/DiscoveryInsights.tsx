import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles } from "lucide-react";

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center min-w-[42px]">
      <p className={`text-sm font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

/**
 * Per-creator dashboard widget: discovery score, watch %, views, and CTR per
 * piece of content, ranked by how the algorithm is surfacing it.
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

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" /> Discovery insights
        </h3>
        <span className="text-xs text-muted-foreground">Updated every 30 min</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[60px] rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-10">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No discovery data yet</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs mx-auto">
            Upload a video to enter the discovery feed and see how the algorithm surfaces it.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto -mr-1 pr-1">
          {data.map((row: any, i: number) => {
            const ctr = row.impressions > 0 ? ((row.feed_clicks / row.impressions) * 100).toFixed(1) : "—";
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground capitalize">{row.content_type}</span>
                    {row.is_new_creator_boosted && (
                      <Badge className="gap-1 h-5 px-1.5 bg-primary/15 text-primary border-primary/30 text-[10px]">
                        <Sparkles className="w-2.5 h-2.5" /> 1.5×
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{row.category || "Uncategorized"}</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <Metric label="Score" value={Number(row.score).toFixed(1)} accent />
                  <Metric label="Watch" value={`${Number(row.watch_time_avg_pct).toFixed(0)}%`} />
                  <Metric label="Views" value={String(row.views ?? 0)} />
                  <Metric label="CTR" value={ctr === "—" ? "—" : `${ctr}%`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
