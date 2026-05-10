import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useTopListeners } from "../hooks/useListeningStats";

interface Props {
  artistId: string;
  limit?: number;
}

export function TopListenersList({ artistId, limit = 10 }: Props) {
  const { data: listeners = [], isLoading } = useTopListeners(artistId, limit);

  return (
    <Card className="bg-card/40 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-4 h-4 text-primary" />
          Top Listeners
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : listeners.length === 0 ? (
          <div className="text-sm text-muted-foreground">No listening activity yet.</div>
        ) : (
          <ol className="space-y-2">
            {listeners.map((l, idx) => {
              const mins = Math.floor(l.total_seconds / 60);
              return (
                <li
                  key={l.fan_id}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-primary w-5">#{idx + 1}</span>
                    <span className="text-sm font-mono truncate">
                      {l.fan_id.slice(0, 8)}…
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {mins}m · {l.sessions} plays
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
