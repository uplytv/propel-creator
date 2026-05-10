import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, ChevronDown, ChevronUp } from "lucide-react";
import {
  useLineAnnotations,
  useAddLyricAnnotation,
  type LyricLine,
} from "../hooks/useLyricAnnotations";

interface Props {
  line: LyricLine;
}

export function LyricLineRow({ line }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const annotations = useLineAnnotations(open ? line.id : undefined);
  const add = useAddLyricAnnotation();

  const submit = async () => {
    if (!body.trim()) return;
    await add.mutateAsync({ lineId: line.id, sheetId: line.sheet_id, body: body.trim() });
    setBody("");
  };

  return (
    <div className="border-b border-border/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-accent/30 min-h-[44px]"
      >
        <span className="text-xs text-muted-foreground tabular-nums w-6 pt-0.5">
          {line.line_number}
        </span>
        <span className="flex-1 text-sm leading-relaxed">{line.line_text}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {line.annotation_count}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pl-12 space-y-2">
          {annotations.data?.map((a) => (
            <div key={a.id} className="rounded-md bg-muted/40 p-2 text-sm">
              <p className="whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-muted-foreground mt-1">↑ {a.upvote_count}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add an annotation…"
              className="min-h-[44px] text-base"
              rows={2}
            />
            <Button
              type="button"
              onClick={submit}
              disabled={add.isPending || !body.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Post annotation"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
