import { useMemo, useState } from "react";
import { CheckCircle, XCircle, Loader2, ListChecks, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useLessonQuiz,
  useQuizQuestions,
  useMyQuizAttempts,
  useGradeQuiz,
  type QuizGradeResult,
} from "@/hooks/useCourseDepth";

/**
 * Member-facing quiz rendered under a lesson. Questions arrive WITHOUT the
 * answer key (get_quiz_questions RPC); grading happens server-side in
 * grade_quiz_attempt, which also records the attempt. Passing auto-completes
 * the lesson via onPass (the parent reuses the completion mutation).
 * Mount with key={lessonId} so state resets between lessons.
 */
export default function LessonQuiz({
  lessonId,
  isCompleted,
  onPass,
}: {
  lessonId: string;
  isCompleted: boolean;
  onPass: () => void;
}) {
  const { user } = useAuth();
  const { data: quiz } = useLessonQuiz(lessonId);
  const { data: questions = [], isLoading: questionsLoading } = useQuizQuestions(quiz?.id);
  const { data: attempts = [] } = useMyQuizAttempts(quiz?.id);
  const grade = useGradeQuiz();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizGradeResult | null>(null);

  const bestScore = useMemo(
    () => attempts.reduce((max, a) => Math.max(max, a.score_pct), 0),
    [attempts],
  );
  const everPassed = useMemo(() => attempts.some((a) => a.passed), [attempts]);

  if (!quiz || !user) return null;
  if (questionsLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading quiz…
      </div>
    );
  }
  if (questions.length === 0) return null;

  const resultFor = (questionId: string) => result?.results?.find((r) => r.question_id === questionId);
  const allAnswered = questions.every((q) => answers[q.id] != null);

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error("Answer every question first");
      return;
    }
    try {
      const res = await grade.mutateAsync({ quizId: quiz.id, answers });
      setResult(res);
      if (res.passed) {
        if (!isCompleted) onPass();
        else toast.success(`Passed with ${res.score_pct}%`);
      }
    } catch (err: any) {
      toast.error("Couldn't submit quiz", { description: err.message });
    }
  };

  const retake = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-secondary/40 border-b border-border">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Lesson quiz</p>
          <span className="text-[11px] text-muted-foreground">Pass mark {quiz.pass_pct}%</span>
        </div>
        {attempts.length > 0 && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${everPassed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Trophy className="w-3 h-3" /> Best {bestScore}%
          </span>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b border-border ${result.passed ? "bg-primary/5" : "bg-destructive/5"}`}>
          <div className="flex items-center gap-2">
            {result.passed
              ? <CheckCircle className="w-4 h-4 text-primary" />
              : <XCircle className="w-4 h-4 text-destructive" />}
            <p className="text-sm font-semibold text-foreground">
              {result.passed ? `Passed — ${result.score_pct}%` : `${result.score_pct}% — needs ${result.pass_pct}% to pass`}
            </p>
            <span className="text-[11px] text-muted-foreground">{result.correct}/{result.total} correct</span>
          </div>
          <button onClick={retake} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0">
            <RotateCcw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}

      {/* Questions */}
      <div className="divide-y divide-border">
        {questions.map((q, i) => {
          const qr = resultFor(q.id);
          return (
            <div key={q.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5 flex-shrink-0">Q{i + 1}</span>
                <p className="text-sm font-medium text-foreground flex-1">{q.question}</p>
                {qr && (qr.correct
                  ? <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />)}
              </div>
              <div className="space-y-1.5 pl-6">
                {q.options.map((opt, oi) => {
                  const chosen = answers[q.id] === oi;
                  const wrongChoice = qr && !qr.correct && qr.chosen === oi;
                  return (
                    <label
                      key={oi}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        chosen ? "bg-primary/10 text-foreground" : "bg-secondary/40 text-foreground hover:bg-secondary/70"
                      } ${wrongChoice ? "outline outline-1 outline-destructive/50" : ""} ${result ? "pointer-events-none" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${quiz.id}-${q.id}`}
                        checked={chosen}
                        disabled={!!result}
                        onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                        className="accent-[hsl(var(--primary))] flex-shrink-0"
                      />
                      <span className="flex-1">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!result && (
        <div className="px-4 py-3 border-t border-border">
          <Button onClick={handleSubmit} disabled={!allAnswered || grade.isPending} className="w-full font-semibold gap-1.5">
            {grade.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit answers
          </Button>
          {!allAnswered && (
            <p className="text-[11px] text-muted-foreground text-center mt-1.5">
              {questions.filter((q) => answers[q.id] == null).length} question(s) left
            </p>
          )}
        </div>
      )}
    </div>
  );
}
