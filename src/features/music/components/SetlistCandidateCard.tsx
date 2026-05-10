import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { SetlistCandidate } from "../hooks/useSetlistVoting";
import { useToggleSetlistVote } from "../hooks/useSetlistVoting";

interface Props {
  candidate: SetlistCandidate;
  voted: boolean;
}

export function SetlistCandidateCard({ candidate, voted }: Props) {
  const toggle = useToggleSetlistVote();
  const locked = candidate.status !== "open";

  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{candidate.track_title}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{candidate.show_label}</span>
          {candidate.show_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(candidate.show_date), "MMM d")}
            </span>
          )}
          {locked && <Badge variant="secondary" className="capitalize">{candidate.status}</Badge>}
        </div>
        {candidate.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{candidate.notes}</p>
        )}
      </div>
      <Button
        size="sm"
        variant={voted ? "default" : "outline"}
        disabled={locked || toggle.isPending}
        onClick={() =>
          toggle.mutate({
            candidate_id: candidate.id,
            artist_id: candidate.artist_id,
            voted,
          })
        }
        className="min-h-11 gap-1"
      >
        <ThumbsUp className="w-4 h-4" />
        {candidate.vote_count}
      </Button>
    </Card>
  );
}
