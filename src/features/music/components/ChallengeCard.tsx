import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock } from 'lucide-react';

interface Props {
  challenge: any;
}

function timeRemaining(deadline?: string | null) {
  if (!deadline) return 'No deadline';
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function ChallengeCard({ challenge }: Props) {
  return (
    <Link to={`/music/challenges/${challenge.id}`} className="block">
      <Card className="overflow-hidden hover:border-primary/40 transition-colors">
        {challenge.artwork_url && (
          <img
            src={challenge.artwork_url}
            alt={challenge.title}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize text-[10px]">
              {challenge.challenge_type}
            </Badge>
            {challenge.prize_cents > 0 && (
              <Badge className="text-[10px]">
                <Trophy size={10} className="mr-1" />${(challenge.prize_cents / 100).toFixed(0)}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm line-clamp-2">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1">
              <Users size={12} />{challenge.entry_count} entries
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />{timeRemaining(challenge.submission_deadline)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
