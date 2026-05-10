import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useAMASession,
  useAMAQuestions,
  useMyAMAVotes,
  useSubmitAMAQuestion,
  useToggleAMAVote,
  useAnswerAMAQuestion,
} from "../hooks/useAMA";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, CheckCircle2, Mic } from "lucide-react";

export default function AMASessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: session, isLoading } = useAMASession(id);
  const { data: questions } = useAMAQuestions(id);
  const { data: votedSet } = useMyAMAVotes(id);
  const submit = useSubmitAMAQuestion();
  const toggleVote = useToggleAMAVote();
  const answer = useAnswerAMAQuestion();
  const [text, setText] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!session) return <div className="p-6 text-muted-foreground">Session not found.</div>;

  const isArtist = user?.id === session.artist_id;

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await submit.mutateAsync({ session_id: session.id, question: text.trim() });
      setText("");
      toast({ title: "Question submitted" });
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto p-4 space-y-5">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Mic className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wide">{session.status}</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{session.title}</h1>
        {session.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(session.scheduled_for).toLocaleString()}
        </p>
      </header>

      {!isArtist && (
        <form onSubmit={submitQuestion} className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask the artist a question…"
            rows={3}
            className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-base text-foreground"
          />
          <button
            type="submit"
            disabled={submit.isPending || !text.trim()}
            className="w-full min-h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {submit.isPending ? "Submitting…" : "Submit question"}
          </button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Questions</h2>
        {!questions?.length && (
          <p className="text-sm text-muted-foreground">No questions yet.</p>
        )}
        <ul className="space-y-2">
          {questions?.map((q) => {
            const voted = votedSet?.has(q.id) ?? false;
            return (
              <li key={q.id} className="rounded-xl border border-border/50 bg-card/40 p-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      toggleVote.mutate({ question_id: q.id, session_id: session.id, voted })
                    }
                    disabled={!user || toggleVote.isPending}
                    className={`min-w-11 min-h-11 flex flex-col items-center justify-center rounded-lg border ${
                      voted ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-foreground"
                    }`}
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">{q.upvote_count}</span>
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{q.question}</p>
                    {q.is_answered && q.answer && (
                      <div className="mt-2 rounded-lg bg-primary/5 border border-primary/30 p-2">
                        <div className="flex items-center gap-1 text-xs text-primary mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Answered
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    )}
                    {isArtist && !q.is_answered && (
                      <div className="mt-2 space-y-1.5">
                        <textarea
                          value={answerDrafts[q.id] ?? ""}
                          onChange={(e) =>
                            setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                          }
                          placeholder="Write your answer…"
                          rows={2}
                          className="w-full rounded-lg bg-background border border-border/60 px-2 py-1.5 text-base text-foreground"
                        />
                        <button
                          type="button"
                          disabled={!answerDrafts[q.id]?.trim() || answer.isPending}
                          onClick={() =>
                            answer
                              .mutateAsync({
                                question_id: q.id,
                                session_id: session.id,
                                answer: (answerDrafts[q.id] ?? "").trim(),
                              })
                              .then(() => setAnswerDrafts((d) => ({ ...d, [q.id]: "" })))
                          }
                          className="min-h-11 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                        >
                          Post answer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
