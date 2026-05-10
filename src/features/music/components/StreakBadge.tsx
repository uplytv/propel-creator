import { memo } from "react";
import { Flame, Trophy, Calendar } from "lucide-react";
import {
  nextStreakMilestone,
  useMyListeningStreak,
} from "../hooks/useListeningStreaks";

interface Props {
  artistId: string;
  compact?: boolean;
}

function StreakBadgeImpl({ artistId, compact }: Props) {
  const { data: streak, isLoading } = useMyListeningStreak(artistId);

  if (isLoading || !streak) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-3 text-sm text-muted-foreground">
        Listen today to start your streak.
      </div>
    );
  }

  const next = nextStreakMilestone(streak.current_streak);
  const prev = next
    ? [0, 3, 7, 14, 30, 60, 100, 365].filter((m) => m < next).pop() ?? 0
    : streak.current_streak;
  const pct = next ? Math.min(100, ((streak.current_streak - prev) / (next - prev)) * 100) : 100;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-semibold">
        <Flame className="h-3.5 w-3.5" />
        {streak.current_streak}-day streak
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <span className="font-semibold">{streak.current_streak}-day streak</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            best {streak.longest_streak}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {streak.total_days} days
          </span>
        </div>
      </div>
      {next && (
        <>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {next - streak.current_streak} day{next - streak.current_streak === 1 ? "" : "s"} to
            unlock the {next}-day milestone.
          </p>
        </>
      )}
    </div>
  );
}

export const StreakBadge = memo(StreakBadgeImpl);
