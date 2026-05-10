import { memo, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useReplyToVoiceMemo, useVoiceMemoReplies } from "../hooks/useVoiceMemos";

interface Props {
  memoId: string;
}

function VoiceMemoRepliesImpl({ memoId }: Props) {
  const { data: replies = [], isLoading } = useVoiceMemoReplies(memoId);
  const reply = useReplyToVoiceMemo();
  const [body, setBody] = useState("");

  return (
    <div className="space-y-3">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (text.length < 1) return;
          reply.mutate(
            { memo_id: memoId, body: text },
            {
              onSuccess: () => {
                setBody("");
                toast({ title: "Reply sent" });
              },
              onError: (err: any) =>
                toast({ title: "Could not reply", description: err.message, variant: "destructive" }),
            },
          );
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Reply to this memo…"
        />
        <Button type="submit" size="sm" disabled={reply.isPending} className="w-full">
          <Send className="h-4 w-4 mr-1.5" />
          {reply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading replies…</p>
      ) : replies.length === 0 ? (
        <p className="text-xs text-muted-foreground">Be the first to reply.</p>
      ) : (
        <ul className="space-y-2">
          {replies.map((r: any) => (
            <li key={r.id} className="rounded-lg border border-border bg-card/40 p-3">
              <p className="text-sm whitespace-pre-line">{r.body}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const VoiceMemoReplies = memo(VoiceMemoRepliesImpl);
