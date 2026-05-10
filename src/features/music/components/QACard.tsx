import { memo } from "react";
import { ChevronUp, MessageCircle } from "lucide-react";
import {
  useMyQAUpvote,
  useQAAnswer,
  useToggleQAUpvote,
  type QAQuestion,
} from "../hooks/useArtistQA";

interface Props {
  question: QAQuestion;
}

function QACardImpl({ question }: Props) {
  const { data: answer } = useQAAnswer(
    question.status === "answered" ? question.id : undefined,
  );
  const { data: voted } = useMyQAUpvote(question.id);
  const toggle = useToggleQAUpvote();

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => toggle.mutate({ question_id: question.id, on: !voted })}
          className={`shrink-0 min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-lg border ${
            voted ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground"
          }`}
          aria-label="Upvote question"
        >
          <ChevronUp className="h-4 w-4" />
          <span className="text-xs font-semibold">{question.upvotes}</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-line">{question.body}</p>
          <div className="mt-1 text-xs text-muted-foreground">
            {question.is_anonymous ? "Anonymous fan" : question.fan_id.slice(0, 8)}
          </div>
        </div>
      </div>
      {answer && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
            <MessageCircle className="h-3 w-3" />
            Artist answered
          </div>
          <p className="text-sm whitespace-pre-line">{answer.body}</p>
        </div>
      )}
    </div>
  );
}

export const QACard = memo(QACardImpl);
