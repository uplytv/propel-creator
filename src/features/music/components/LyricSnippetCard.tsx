import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Heart, Sparkles, Waves, MessageSquarePlus } from "lucide-react";
import { useToggleLyricReaction, type LyricReaction, type LyricSnippet } from "../hooks/useLyricSnippets";

interface Props {
  snippet: LyricSnippet;
  myReaction?: LyricReaction | null;
  onSuggest?: (snippetId: string) => void;
}

const REACTIONS: { key: LyricReaction; Icon: typeof Flame; label: string }[] = [
  { key: "fire", Icon: Flame, label: "Fire" },
  { key: "heart", Icon: Heart, label: "Heart" },
  { key: "genius", Icon: Sparkles, label: "Genius" },
  { key: "feels", Icon: Waves, label: "Feels" },
];

export function LyricSnippetCard({ snippet, myReaction, onSuggest }: Props) {
  const toggle = useToggleLyricReaction();

  return (
    <Card className="p-4 space-y-3 bg-card/40 border-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{snippet.title}</h3>
          {snippet.mood && (
            <p className="text-xs text-muted-foreground mt-0.5">Mood: {snippet.mood}</p>
          )}
        </div>
        <Badge variant="outline" className="capitalize shrink-0">{snippet.status}</Badge>
      </div>

      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/30 rounded-md p-3 border border-border/40">
        {snippet.snippet_text}
      </pre>

      <div className="flex items-center gap-2 flex-wrap">
        {REACTIONS.map(({ key, Icon, label }) => (
          <Button
            key={key}
            size="sm"
            variant={myReaction === key ? "default" : "outline"}
            className="h-9 min-w-[44px] gap-1"
            onClick={() => toggle.mutate({ snippet_id: snippet.id, reaction: key, current: myReaction ?? null })}
            disabled={toggle.isPending}
            aria-label={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{snippet.reaction_count} reactions</span>
          <span>{snippet.suggestion_count} suggestions</span>
        </div>
      </div>

      {onSuggest && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2 h-10"
          onClick={() => onSuggest(snippet.id)}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Suggest a line
        </Button>
      )}
    </Card>
  );
}
