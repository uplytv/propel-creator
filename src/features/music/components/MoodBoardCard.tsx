import { memo } from "react";
import { Link } from "react-router-dom";
import { Heart, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type MoodBoard } from "../hooks/useMoodBoards";

interface Props {
  board: MoodBoard;
  to?: string;
}

function MoodBoardCardImpl({ board, to }: Props) {
  const href = to ?? `/music/mood-boards/${board.id}`;
  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-2xl border border-border bg-card/50 transition hover:border-primary/40"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {board.cover_url ? (
          <img
            src={board.cover_url}
            alt={board.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Palette className="h-8 w-8" aria-hidden />
          </div>
        )}
        {!board.is_published && (
          <Badge variant="secondary" className="absolute left-2 top-2 text-[10px]">
            Draft
          </Badge>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate text-sm font-semibold text-foreground">{board.title}</h3>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{board.mood ?? "Mood board"}</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden />
            {board.like_count}
          </span>
        </div>
      </div>
    </Link>
  );
}

export const MoodBoardCard = memo(MoodBoardCardImpl);
