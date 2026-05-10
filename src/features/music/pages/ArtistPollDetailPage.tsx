import { useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  useArtistPoll,
  useArtistPollOptions,
  useCastArtistPollVote,
  useMyArtistPollVote,
} from "../hooks/useArtistPolls";

export default function ArtistPollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: poll, isLoading } = useArtistPoll(id);
  const { data: options = [] } = useArtistPollOptions(id);
  const { data: myVote } = useMyArtistPollVote(id);
  const cast = useCastArtistPollVote();

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!poll) {
    return <div className="p-4 text-sm text-muted-foreground">Poll not found.</div>;
  }

  const total = poll.total_votes || 0;
  const closed = poll.status !== "open";

  return (
    <div className="mobile-safe-content p-4 space-y-4 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{poll.question}</h1>
        {poll.description && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
            {poll.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {total} {total === 1 ? "vote" : "votes"}
          {closed ? " · closed" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
          const mine = myVote?.option_id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={closed || cast.isPending}
              onClick={() =>
                cast.mutate(
                  { poll_id: poll.id, option_id: opt.id },
                  {
                    onSuccess: () => toast({ title: mine ? "Vote updated" : "Vote cast" }),
                    onError: (err: any) =>
                      toast({
                        title: "Could not vote",
                        description: err.message,
                        variant: "destructive",
                      }),
                  },
                )
              }
              className={`relative w-full text-left rounded-xl border overflow-hidden p-3 min-h-[44px] transition-colors ${
                mine
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card/40 hover:border-primary/40"
              } ${closed ? "opacity-80 cursor-default" : ""}`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/10"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center gap-3">
                {opt.image_url && (
                  <img
                    src={opt.image_url}
                    alt={opt.label}
                    loading="lazy"
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{opt.label}</span>
                    {mine && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {opt.vote_count} · {pct}%
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {!closed && (
        <p className="text-xs text-muted-foreground">Tap an option to cast or change your vote.</p>
      )}
    </div>
  );
}
