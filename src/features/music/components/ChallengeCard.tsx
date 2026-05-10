import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Props {
  challenge: {
    id: string;
    title: string;
    challenge_type: string;
    artwork_url?: string | null;
    prize_description?: string | null;
    prize_cents: number;
    entry_count: number;
    submission_deadline?: string | null;
    status: string;
  };
}

export function ChallengeCard({ challenge }: Props) {
  const deadline = challenge.submission_deadline ? new Date(challenge.submission_deadline) : null;
  const ended = deadline ? deadline < new Date() : false;

  return (
    <Link to={`/music/challenges/${challenge.id}`}>
      <Card className="overflow-hidden hover:border-primary transition-colors h-full">
        <div className="aspect-video bg-muted relative">
          {challenge.artwork_url ? (
            <img src={challenge.artwork_url} alt={challenge.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <Badge className="absolute top-2 left-2 capitalize">{challenge.challenge_type}</Badge>
          {challenge.prize_cents > 0 && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              ${(challenge.prize_cents / 100).toFixed(0)} prize
            </Badge>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold truncate">{challenge.title}</h3>
          {challenge.prize_description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{challenge.prize_description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {challenge.entry_count}
            </span>
            {deadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ended ? "Closed" : formatDistanceToNow(deadline, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
