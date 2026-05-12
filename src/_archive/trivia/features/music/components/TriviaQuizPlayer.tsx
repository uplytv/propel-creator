import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Check, X, Loader2, Trophy } from "lucide-react";
import { useTriviaQuestions, useSubmitTriviaAttempt, type TriviaQuiz } from "../hooks/useTriviaQuizzes";

interface Props {
  quiz: TriviaQuiz;
  onFinished?: (score: number, total: number) => void;
}

export function TriviaQuizPlayer({ quiz, onFinished }: Props) {
  const { data: questions = [], isLoading } = useTriviaQuestions(quiz.id);
  const submit = useSubmitTriviaAttempt();

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (q.points || 0), 0),
    [questions]
  );

  const current = questions[idx];

  useEffect(() => {
    if (!done && questions.length > 0 && idx >= questions.length) {
      setDone(true);
      const dur = Math.round((Date.now() - startedAt) / 1000);
      submit.mutate(
        { quiz_id: quiz.id, score, total_points: totalPoints, duration_seconds: dur },
        { onSuccess: () => onFinished?.(score, totalPoints) }
      );
    }
  }, [idx, questions.length, done, score, totalPoints, startedAt, quiz.id, submit, onFinished]);

  if (isLoading) {
    return (
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No questions yet.
        </CardContent>
      </Card>
    );
  }

  if (done) {
    const pct = totalPoints ? Math.round((score / totalPoints) * 100) : 0;
    return (
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-6 text-center space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-primary" />
          <div className="text-2xl font-bold">
            {score} / {totalPoints}
          </div>
          <div className="text-sm text-muted-foreground">{pct}% — submitted to leaderboard</div>
        </CardContent>
      </Card>
    );
  }

  const pickAnswer = (i: number) => {
    if (revealed) return;
    setPicked(i);
    setRevealed(true);
    if (i === current.correct_index) setScore((s) => s + current.points);
  };

  const next = () => {
    setPicked(null);
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  const progress = Math.round(((idx + (revealed ? 1 : 0)) / questions.length) * 100);

  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" /> Q{idx + 1} / {questions.length}
          </span>
          <span>Score: {score}</span>
        </div>
        <Progress value={progress} className="h-1" />

        <h3 className="font-semibold text-base">{current.prompt}</h3>

        <div className="space-y-2">
          {current.choices.map((choice, i) => {
            const isCorrect = i === current.correct_index;
            const isPicked = i === picked;
            let cls = "w-full justify-start min-h-[44px] text-left whitespace-normal";
            if (revealed) {
              if (isCorrect) cls += " border-primary text-primary";
              else if (isPicked) cls += " border-destructive text-destructive";
            }
            return (
              <Button
                key={i}
                variant="outline"
                className={cls}
                onClick={() => pickAnswer(i)}
                disabled={revealed}
              >
                {revealed && isCorrect && <Check className="w-4 h-4 mr-2" />}
                {revealed && isPicked && !isCorrect && <X className="w-4 h-4 mr-2" />}
                {choice}
              </Button>
            );
          })}
        </div>

        {revealed && (
          <Button className="w-full min-h-[44px]" onClick={next}>
            {idx + 1 >= questions.length ? "Finish" : "Next"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
