import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { RemixContest } from "../hooks/useRemixContests";

export default function RemixContestCard({ contest }: { contest: RemixContest }) {
  return (
    <Link to={`/music/remix-contests/${contest.id}`}>
      <Card className="overflow-hidden bg-card hover:bg-accent/30 transition-colors">
        {contest.cover_url && (
          <img src={contest.cover_url} alt={contest.title} className="w-full aspect-video object-cover" />
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">{contest.title}</h3>
            <Badge variant="secondary" className="capitalize">{contest.status}</Badge>
          </div>
          {contest.prize_description && (
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <Trophy className="h-4 w-4" />
              <span className="truncate">{contest.prize_description}</span>
            </div>
          )}
          {contest.submission_deadline && (
            <p className="text-xs text-muted-foreground">
              Submit by {new Date(contest.submission_deadline).toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
