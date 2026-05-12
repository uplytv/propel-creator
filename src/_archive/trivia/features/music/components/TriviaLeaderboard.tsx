import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2 } from "lucide-react";
import { useTriviaLeaderboard } from "../hooks/useTriviaQuizzes";

interface Props {
  quizId: string;
  limit?: number;
}

export function TriviaLeaderboard({ quizId, limit = 25 }: Props) {
  const { data: rows = [], isLoading } = useTriviaLeaderboard(quizId, limit);

  return (
    <Card className="bg-card/40 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-4 h-4 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No attempts yet.</div>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r, i) => {
              const pct = r.total_points
                ? Math.round((r.score / r.total_points) * 100)
                : 0;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-primary w-5">#{i + 1}</span>
                    <span className="font-mono truncate">{r.fan_id.slice(0, 8)}…</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.score}/{r.total_points} · {pct}% · {r.duration_seconds}s
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
