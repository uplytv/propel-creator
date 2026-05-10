import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useTrackDemand } from "../hooks/useTrackWishlist";

interface Props {
  artistId: string;
  limit?: number;
}

export function TrackDemandCard({ artistId, limit = 10 }: Props) {
  const { data: demand = [], isLoading } = useTrackDemand(artistId);
  const top = demand.slice(0, limit);
  const max = top[0]?.fans ?? 1;

  return (
    <Card className="bg-card/40 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4 text-primary" />
          Most Wished Tracks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : top.length === 0 ? (
          <div className="text-sm text-muted-foreground">No fan wishlist activity yet.</div>
        ) : (
          <ul className="space-y-2">
            {top.map((d) => {
              const pct = Math.round((d.fans / max) * 100);
              return (
                <li key={d.track_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono truncate max-w-[180px]">
                      {d.track_id.slice(0, 12)}…
                    </span>
                    <span className="text-muted-foreground">
                      {d.fans} fans · ★ {d.avg_priority.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
