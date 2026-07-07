import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useLessonQuiz,
  useQuizQuestionsForOwner,
  useSaveQuiz,
  useDeleteQuiz,
  type QuizQuestionDraft,
} from "@/hooks/useCourseDepth";

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

function emptyQuestion(): QuizQuestionDraft {
  return { question: "", options: ["", ""], correct_index: 0 };
}

/**
 * Creator-side quiz builder, mounted inside LessonEditorForm (edit mode).
 * Owns its own save (quiz shell upsert + question-set replace) so it never
 * interferes with the lesson save. correct_index is only readable here because
 * the creator RLS policy on quiz_questions allows it — members never see it.
 */
export default function LessonQuizEditor({ lessonId }: { lessonId: string }) {
  const { data: quiz, isLoading: quizLoading } = useLessonQuiz(lessonId);
  const { data: existingQuestions, isLoading: questionsLoading } = useQuizQuestionsForOwner(quiz?.id);
  const saveQuiz = useSaveQuiz();
  const deleteQuiz = useDeleteQuiz();

  const [enabled, setEnabled] = useState(false);
  const [passPct, setPassPct] = useState<number>(70);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate local state from the stored quiz exactly once.
  useEffect(() => {
    if (hydrated || quizLoading) return;
    if (quiz && questionsLoading) return;
    if (quiz) {
      setEnabled(true);
      setPassPct(quiz.pass_pct);
      setQuestions((existingQuestions || []).map((q) => ({ ...q, options: [...q.options] })));
    }
    setHydrated(true);
  }, [hydrated, quiz, quizLoading, existingQuestions, questionsLoading]);

  const updateQuestion = (i: number, patch: Partial<QuizQuestionDraft>) =>
    setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const handleSave = async () => {
    const cleaned = questions
      .map((q) => ({ ...q, question: q.question.trim(), options: q.options.map((o) => o.trim()) }))
      .filter((q) => q.question || q.options.some((o) => o));
    for (const [i, q] of cleaned.entries()) {
      if (!q.question) { toast.error(`Question ${i + 1} needs text`); return; }
      const filled = q.options.filter((o) => o);
      if (filled.length < MIN_OPTIONS) { toast.error(`Question ${i + 1} needs at least ${MIN_OPTIONS} options`); return; }
      if (filled.length !== q.options.length) { toast.error(`Question ${i + 1} has an empty option`); return; }
      if (q.correct_index < 0 || q.correct_index >= q.options.length) { toast.error(`Question ${i + 1}: pick the correct answer`); return; }
    }
    if (cleaned.length === 0) { toast.error("Add at least one question"); return; }
    const pct = Math.min(100, Math.max(1, Math.round(passPct || 70)));
    try {
      await saveQuiz.mutateAsync({ lessonId, passPct: pct, questions: cleaned });
      toast.success("Quiz saved!");
    } catch (err: any) {
      toast.error("Couldn't save quiz", { description: err.message });
    }
  };

  const handleRemove = async () => {
    if (quiz) {
      try {
        await deleteQuiz.mutateAsync({ quizId: quiz.id, lessonId });
      } catch (err: any) {
        toast.error("Couldn't remove quiz", { description: err.message });
        return;
      }
    }
    setEnabled(false);
    setQuestions([]);
    setPassPct(70);
    toast.success("Quiz removed");
  };

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading quiz…
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">Quiz</p>
          <p className="text-xs text-muted-foreground">Test students at the end of this lesson</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs font-semibold"
          onClick={() => { setEnabled(true); if (questions.length === 0) setQuestions([emptyQuestion()]); }}
        >
          <ListChecks className="w-3.5 h-3.5" /> Add quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ListChecks className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Quiz</p>
        </div>
        <button onClick={handleRemove} className="text-xs font-medium px-2 py-1 rounded text-destructive hover:bg-secondary">
          Remove quiz
        </button>
      </div>

      {/* Pass mark */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">Pass mark</p>
          <p className="text-xs text-muted-foreground">Passing auto-completes the lesson</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Input
            type="number"
            min={1}
            max={100}
            value={passPct}
            onChange={(e) => setPassPct(parseInt(e.target.value, 10) || 0)}
            className="w-20 h-8 border-0 bg-secondary text-xs font-semibold text-center"
          />
          <span className="text-xs font-semibold text-muted-foreground">%</span>
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <div key={i} className="space-y-2 rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex-shrink-0">Q{i + 1}</span>
            <Input
              placeholder="Question"
              value={q.question}
              onChange={(e) => updateQuestion(i, { question: e.target.value })}
              className="border-0 bg-secondary flex-1"
            />
            <button
              onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
              className="p-2 rounded text-muted-foreground hover:bg-secondary hover:text-destructive flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`quiz-correct-${lessonId}-${i}`}
                  checked={q.correct_index === oi}
                  onChange={() => updateQuestion(i, { correct_index: oi })}
                  className="accent-[hsl(var(--primary))] flex-shrink-0"
                  title="Mark as correct answer"
                />
                <Input
                  placeholder={`Option ${oi + 1}`}
                  value={opt}
                  onChange={(e) => updateQuestion(i, { options: q.options.map((o, oj) => (oj === oi ? e.target.value : o)) })}
                  className="border-0 bg-secondary flex-1 h-8 text-sm"
                />
                {q.options.length > MIN_OPTIONS && (
                  <button
                    onClick={() =>
                      updateQuestion(i, {
                        options: q.options.filter((_, oj) => oj !== oi),
                        correct_index:
                          q.correct_index === oi ? 0 : q.correct_index > oi ? q.correct_index - 1 : q.correct_index,
                      })
                    }
                    className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {q.options.length < MAX_OPTIONS ? (
              <button
                onClick={() => updateQuestion(i, { options: [...q.options, ""] })}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Add option
              </button>
            ) : <span />}
            <p className="text-[10px] text-muted-foreground">Radio marks the correct answer</p>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setQuestions([...questions, emptyQuestion()])}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add question
        </button>
        <Button size="sm" onClick={handleSave} disabled={saveQuiz.isPending} className="gap-1.5 text-xs font-semibold">
          {saveQuiz.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save quiz
        </Button>
      </div>
    </div>
  );
}
