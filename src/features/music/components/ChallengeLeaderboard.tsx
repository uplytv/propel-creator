import { Trophy, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useChallengeLeaderboard } from "../hooks/useChallenges";

export function ChallengeLeaderboard({ challengeId }: { challengeId: string }) {
  const { data: rows = [], isLoading } = useChallengeLeaderboard(challengeId);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No entries yet.</div>;

  return (
    <div className="space-y-2">
      {rows.map((row: any) => {
        const rank = Number(row.rank);
        return (
          <Card key={row.entry_id} className="p-3 flex items-center gap-3">
            <div className="w-8 text-center font-bold">
              {rank === 1 && <Trophy className="w-5 h-5 mx-auto text-yellow-400" />}
              {rank === 2 && <Medal className="w-5 h-5 mx-auto text-zinc-300" />}
              {rank === 3 && <Medal className="w-5 h-5 mx-auto text-orange-400" />}
              {rank > 3 && <span>#{rank}</span>}
            </div>
            {row.artwork_url ? (
              <img src={row.artwork_url} alt="" loading="lazy" className="w-10 h-10 rounded object-cover" />
            ) : (
              <div className="w-10 h-10 rounded bg-muted" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.vote_count} votes · score {Number(row.score).toFixed(1)}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
