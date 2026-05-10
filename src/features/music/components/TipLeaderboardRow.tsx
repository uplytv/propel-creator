import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Medal } from 'lucide-react';
import type { TipperLeaderEntry } from '../hooks/useSuperThanks';

interface Props {
  rank: number;
  entry: TipperLeaderEntry;
}

export function TipLeaderboardRow({ rank, entry }: Props) {
  const name = entry.display_name ?? 'Anonymous fan';
  const initials = name.slice(0, 2).toUpperCase();
  const dollars = (entry.total_cents / 100).toFixed(2);

  const badge =
    rank === 1 ? (
      <Crown className="w-4 h-4 text-yellow-400" />
    ) : rank <= 3 ? (
      <Medal className="w-4 h-4 text-muted-foreground" />
    ) : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
      <div className="w-7 text-center font-bold text-muted-foreground">{rank}</div>
      <Avatar className="w-10 h-10">
        {entry.avatar_url ? <AvatarImage src={entry.avatar_url} alt={name} /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 truncate font-medium">
          <span className="truncate">{name}</span>
          {badge}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.tip_count} tip{entry.tip_count === 1 ? '' : 's'}
        </div>
      </div>
      <div className="font-bold text-primary">${dollars}</div>
    </div>
  );
}
