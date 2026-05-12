import { memo } from "react";
import { Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type LinerNote,
  useMyLinerNoteReaction,
  useToggleLinerNoteReaction,
} from "../hooks/useLinerNotes";

interface Props {
  note: LinerNote;
}

const LABELS: Record<LinerNote["story_type"], string> = {
  story: "Story",
  credits: "Credits",
  recording: "Recording",
  inspiration: "Inspiration",
  lyric_meaning: "Lyric Meaning",
};

function LinerNoteCardImpl({ note }: Props) {
  const { data: liked = false } = useMyLinerNoteReaction(note.id);
  const toggle = useToggleLinerNoteReaction();

  return (
    <article className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            <Badge variant="secondary" className="text-[10px]">
              {LABELS[note.story_type]}
            </Badge>
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-foreground">
            {note.track_title}
          </h3>
          {note.album && (
            <p className="truncate text-xs text-muted-foreground">{note.album}</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant={liked ? "default" : "outline"}
          className="min-h-11 min-w-11 gap-1.5"
          onClick={() => toggle.mutate({ noteId: note.id, liked })}
          disabled={toggle.isPending}
          aria-pressed={liked}
          aria-label={liked ? "Unlike liner note" : "Like liner note"}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} aria-hidden />
          <span className="text-xs font-medium">{note.like_count}</span>
        </Button>
      </header>
      <p className="whitespace-pre-line text-sm text-foreground/90">{note.body}</p>
    </article>
  );
}

export const LinerNoteCard = memo(LinerNoteCardImpl);
