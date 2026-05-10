import { Trophy, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useStreakLeaderboard } from '../hooks/useMusicGamification';

const MEDAL = ['🥇', '🥈', '🥉'];

export function StreakLeaderboard({ limit = 25 }: { limit?: number }) {
  const { data: rows = [], isLoading } = useStreakLeaderboard(limit);

  if (isLoading) return <div className="h-40 rounded-xl bg-muted/20 animate-pulse" />;
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Flame className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Be the first to start a streak
      </div>
    );
  }

  return (
    <Card className="bg-card/40 border-border/40 overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border/40">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="font-bold">Top streaks</h3>
      </div>
      <ol className="divide-y divide-border/40">
        {rows.map((r: any, i: number) => (
          <li
            key={r.user_id}
            className="flex items-center gap-3 px-3 py-2.5 min-h-[44px]"
          >
            <span className="w-7 text-center font-bold text-sm">
              {MEDAL[i] ?? `#${i + 1}`}
            </span>
            <span className="flex-1 truncate text-sm font-mono">
              {String(r.user_id).slice(0, 8)}…
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              {r.current_streak}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
