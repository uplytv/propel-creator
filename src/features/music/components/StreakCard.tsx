import { Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useMyStreak } from '../hooks/useMusicGamification';

export function StreakCard() {
  const { data: streak, isLoading } = useMyStreak();

  if (isLoading) return <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />;

  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-primary/10 border-primary/30">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Flame
            className={`w-12 h-12 ${current > 0 ? 'text-orange-400 animate-pulse' : 'text-muted-foreground'}`}
          />
          <span className="absolute -bottom-1 -right-1 bg-card text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border border-border">
            {current}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Listening streak</p>
          <p className="text-2xl font-bold">
            {current} day{current === 1 ? '' : 's'}
          </p>
          {longest > current && (
            <p className="text-xs text-muted-foreground">Longest: {longest} days</p>
          )}
        </div>
      </div>
    </Card>
  );
}
