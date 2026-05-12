import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import type {
  StudioDiaryEntry,
  DiaryReaction,
} from "../hooks/useStudioDiary";
import { useToggleDiaryReaction } from "../hooks/useStudioDiary";

const REACTIONS: { key: DiaryReaction; emoji: string }[] = [
  { key: "fire", emoji: "🔥" },
  { key: "heart", emoji: "❤️" },
  { key: "clap", emoji: "👏" },
  { key: "mindblown", emoji: "🤯" },
];

const MOOD_EMOJI: Record<string, string> = {
  flow: "🌊",
  grind: "💪",
  breakthrough: "💡",
  stuck: "🧱",
  exhausted: "🥱",
  hyped: "🚀",
};

interface Props {
  entry: StudioDiaryEntry;
  myReaction: DiaryReaction | null;
}

export function StudioDiaryEntryCard({ entry, myReaction }: Props) {
  const toggle = useToggleDiaryReaction();

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className="capitalize">
              {entry.phase.replace("_", " ")}
            </Badge>
            {entry.mood && (
              <Badge variant="outline" className="capitalize">
                {MOOD_EMOJI[entry.mood] ?? ""} {entry.mood}
              </Badge>
            )}
            {entry.status === "draft" && <Badge variant="outline">Draft</Badge>}
          </div>
          <div className="font-semibold">{entry.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(entry.session_date), "MMM d, yyyy")}
            </span>
            {entry.hours_logged != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {entry.hours_logged}h
              </span>
            )}
          </div>
        </div>
      </div>

      {entry.notes && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{entry.notes}</p>
      )}

      {entry.clip_url && (
        <audio src={entry.clip_url} controls className="w-full" preload="none" />
      )}

      <div className="flex items-center gap-2 pt-1">
        {REACTIONS.map((r) => {
          const active = myReaction === r.key;
          return (
            <Button
              key={r.key}
              size="sm"
              variant={active ? "default" : "outline"}
              className="min-h-11 px-3"
              disabled={toggle.isPending}
              onClick={() =>
                toggle.mutate({
                  entry_id: entry.id,
                  artist_id: entry.artist_id,
                  reaction: r.key,
                  current: myReaction,
                })
              }
            >
              <span className="text-base">{r.emoji}</span>
            </Button>
          );
        })}
        <span className="text-xs text-muted-foreground ml-auto">
          {entry.reaction_count} reactions
        </span>
      </div>
    </Card>
  );
}
