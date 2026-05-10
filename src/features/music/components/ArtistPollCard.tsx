import { memo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Users } from "lucide-react";
import type { ArtistPoll } from "../hooks/useArtistPolls";

interface Props {
  poll: ArtistPoll;
  to?: string;
}

function ArtistPollCardImpl({ poll, to }: Props) {
  const closes = poll.closes_at ? new Date(poll.closes_at) : null;
  const inner = (
    <div className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold line-clamp-2">{poll.question}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {poll.total_votes} votes
            </span>
            <span
              className={`px-1.5 py-0.5 rounded ${
                poll.status === "open"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {poll.status}
            </span>
            {closes && poll.status === "open" && (
              <span>closes {closes.toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export const ArtistPollCard = memo(ArtistPollCardImpl);
