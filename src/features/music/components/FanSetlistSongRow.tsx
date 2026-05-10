import { Heart, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FanSetlistSong } from "../hooks/useFanSetlists";

interface Props {
  song: FanSetlistSong;
  voted: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  maxVotes: number;
  totalVotes: number;
}

export function FanSetlistSongRow({ song, voted, disabled, onToggle, maxVotes, totalVotes }: Props) {
  const pct = maxVotes > 0 ? Math.min(100, (song.vote_count / Math.max(maxVotes, 1)) * 100) : 0;

  return (
    <div className="relative rounded-xl border border-white/10 bg-white/[0.03] p-3 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 bg-primary/10"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <Music2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{song.title}</p>
          {song.artist_label && (
            <p className="text-xs text-muted-foreground truncate">{song.artist_label}</p>
          )}
        </div>
        <div className="text-sm font-semibold tabular-nums">{song.vote_count}</div>
        <Button
          size="sm"
          variant={voted ? "default" : "outline"}
          onClick={onToggle}
          disabled={disabled}
          className="min-h-[44px] min-w-[44px] px-3"
          aria-label={voted ? "Remove vote" : "Vote for this song"}
        >
          <Heart className={cn("h-4 w-4", voted && "fill-current")} />
        </Button>
      </div>
    </div>
  );
}
