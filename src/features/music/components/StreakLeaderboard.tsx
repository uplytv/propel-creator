import { memo } from "react";
import { Flame } from "lucide-react";
import { useTopListeningStreaks } from "../hooks/useListeningStreaks";
import { useAuth } from "@/context/AuthContext";

interface Props {
  artistId: string;
  limit?: number;
}

function StreakLeaderboardImpl({ artistId, limit = 25 }: Props) {
  const { data: rows = [], isLoading } = useTopListeningStreaks(artistId, limit);
  const { user } = useAuth();

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading streaks...</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No streaks yet — be the first fan to start one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const mine = user?.id === r.fan_id;
        return (
          <div
            key={r.id}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              mine ? "border-primary bg-primary/5" : "border-border bg-card/40"
            }`}
          >
            <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0 text-sm font-medium truncate">
              {mine ? "You" : r.fan_id.slice(0, 8)}
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Flame className="h-4 w-4" />
              {r.current_streak}
            </div>
            <div className="text-xs text-muted-foreground">best {r.longest_streak}</div>
          </div>
        );
      })}
    </div>
  );
}

export const StreakLeaderboard = memo(StreakLeaderboardImpl);
