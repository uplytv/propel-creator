import { Button } from "@/components/ui/button";
import { ThumbsUp, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCastCoverVote,
  useMyCoverRequestVotes,
  useRemoveCoverVote,
  type CoverRequestSong,
} from "../hooks/useCoverRequests";

interface Props {
  song: CoverRequestSong;
  topVoteCount: number;
}

export function CoverSongRow({ song, topVoteCount }: Props) {
  const { data: votes = [] } = useMyCoverRequestVotes(song.request_id);
  const cast = useCastCoverVote();
  const remove = useRemoveCoverVote();
  const voted = votes.some((v) => v.song_id === song.id);
  const pct = topVoteCount > 0 ? Math.min(100, (song.vote_count / topVoteCount) * 100) : 0;

  const onToggle = () => {
    const args = { request_id: song.request_id, song_id: song.id };
    voted ? remove.mutate(args) : cast.mutate(args);
  };

  return (
    <div className="relative overflow-hidden rounded-md border bg-card">
      <div
        className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center gap-3 p-3">
        <Music2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{song.song_title}</p>
          {song.original_artist && (
            <p className="text-xs text-muted-foreground truncate">{song.original_artist}</p>
          )}
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{song.vote_count}</span>
        <Button
          size="sm"
          variant={voted ? "default" : "outline"}
          onClick={onToggle}
          className={cn("min-h-11 min-w-11", voted && "bg-primary text-primary-foreground")}
          aria-label={voted ? "Remove vote" : "Vote"}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
