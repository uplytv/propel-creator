import { memo } from "react";
import { Link } from "react-router-dom";
import { Mic2, Calendar, Users } from "lucide-react";
import type { CoverContest } from "../hooks/useCoverContests";

interface Props {
  contest: CoverContest;
  to?: string;
  submissionCount?: number;
}

function CoverContestCardImpl({ contest, to, submissionCount }: Props) {
  const deadline = contest.submission_deadline ? new Date(contest.submission_deadline) : null;
  const inner = (
    <div className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mic2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold truncate">Cover: {contest.track_title}</h3>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                contest.status === "open"
                  ? "bg-primary/15 text-primary"
                  : contest.status === "judging"
                  ? "bg-yellow-500/15 text-yellow-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {contest.status}
            </span>
          </div>
          {contest.prize && (
            <p className="text-xs text-primary mt-0.5">Prize: {contest.prize}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {deadline.toLocaleDateString()}
              </span>
            )}
            {submissionCount !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {submissionCount} entries
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export const CoverContestCard = memo(CoverContestCardImpl);
