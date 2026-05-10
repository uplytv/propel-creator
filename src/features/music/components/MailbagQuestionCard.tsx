import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowBigUp, Pin, EyeOff, MessageSquareReply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { MailbagQuestion } from "../hooks/useMailbag";
import {
  useToggleMailbagUpvote,
  useAnswerMailbag,
  useHideMailbag,
} from "../hooks/useMailbag";

interface Props {
  question: MailbagQuestion;
  upvoted: boolean;
  isArtist?: boolean;
}

export function MailbagQuestionCard({ question, upvoted, isArtist }: Props) {
  const toggle = useToggleMailbagUpvote();
  const answer = useAnswerMailbag();
  const hide = useHideMailbag();
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(question.answer ?? "");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Button
          variant={upvoted ? "default" : "outline"}
          size="sm"
          className="flex-col h-auto py-2 px-3 min-w-[3rem]"
          disabled={toggle.isPending}
          onClick={() =>
            toggle.mutate({
              question_id: question.id,
              artist_id: question.artist_id,
              voted: upvoted,
            })
          }
        >
          <ArrowBigUp className="w-4 h-4" />
          <span className="text-xs font-semibold">{question.upvote_count}</span>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {question.is_pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="w-3 h-3" /> Pinned
              </Badge>
            )}
            {question.status === "answered" && <Badge>Answered</Badge>}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm">{question.question}</p>
          {question.answer && (
            <div className="mt-3 p-3 rounded-md bg-muted text-sm">
              <div className="text-xs font-semibold mb-1 text-primary">Artist reply</div>
              {question.answer}
            </div>
          )}
        </div>
      </div>

      {isArtist && question.status !== "hidden" && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReplyOpen((v) => !v)}
            className="gap-1 min-h-11"
          >
            <MessageSquareReply className="w-4 h-4" />
            {question.answer ? "Edit reply" : "Reply"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => hide.mutate({ id: question.id, artist_id: question.artist_id })}
            disabled={hide.isPending}
            className="gap-1 min-h-11"
          >
            <EyeOff className="w-4 h-4" /> Hide
          </Button>
        </div>
      )}

      {isArtist && replyOpen && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={answer.isPending || !reply.trim()}
              onClick={async () => {
                await answer.mutateAsync({
                  id: question.id,
                  artist_id: question.artist_id,
                  answer: reply.trim(),
                });
                setReplyOpen(false);
              }}
              className="min-h-11"
            >
              Publish reply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                answer.mutate({
                  id: question.id,
                  artist_id: question.artist_id,
                  answer: reply.trim() || (question.answer ?? ""),
                  pin: !question.is_pinned,
                })
              }
              className="gap-1 min-h-11"
            >
              <Pin className="w-4 h-4" />
              {question.is_pinned ? "Unpin" : "Pin"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
