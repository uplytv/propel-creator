import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Check, X, Trophy, Clock, Plus, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuizQuestion, QuizState } from "@/hooks/useLiveQuiz";

interface LiveQuizOverlayProps {
  quiz: QuizState;
  isCreator: boolean;
  onSubmitAnswer: (index: number) => void;
}

export function LiveQuizOverlay({ quiz, isCreator, onSubmitAnswer }: LiveQuizOverlayProps) {
  if (quiz.status === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass-card p-4 border border-primary/20"
      >
        {quiz.status === "question" && quiz.currentQuestion && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">
                  Q{quiz.questionIndex + 1}/{quiz.totalQuestions}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span
                  className={`text-sm font-bold tabular-nums ${
                    quiz.timeRemaining <= 5 ? "text-destructive animate-pulse" : "text-foreground"
                  }`}
                >
                  {quiz.timeRemaining}s
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold text-foreground">{quiz.currentQuestion.question}</p>

            <div className="grid grid-cols-1 gap-2">
              {quiz.currentQuestion.options.map((option, i) => {
                const answered = quiz.userAnswer !== null;
                const selected = quiz.userAnswer === i;
                return (
                  <button
                    key={i}
                    onClick={() => !answered && !isCreator && onSubmitAnswer(i)}
                    disabled={answered || isCreator}
                    className={`p-3 rounded-lg text-left text-sm font-medium transition-all border ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-primary/30 hover:bg-primary/5 text-foreground"
                    } ${answered ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-bold mr-2">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {quiz.status === "results" && (
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                quiz.isCorrect ? "bg-green-500/10" : "bg-destructive/10"
              }`}
            >
              {quiz.isCorrect ? (
                <Check className="w-6 h-6 text-green-500" />
              ) : (
                <X className="w-6 h-6 text-destructive" />
              )}
            </motion.div>
            <p className="text-sm font-bold text-foreground">
              {quiz.isCorrect ? "Correct! 🎉" : "Wrong answer"}
            </p>
          </div>
        )}

        {quiz.status === "leaderboard" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold text-foreground">Quiz Leaderboard</span>
            </div>
            <div className="space-y-1.5">
              {quiz.participants.slice(0, 10).map((p, i) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${i < 3 ? "text-warning" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground">{p.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.streak >= 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        🔥 {p.streak}
                      </span>
                    )}
                    <span className="text-xs font-bold text-foreground">{p.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface QuizCreatorPanelProps {
  onStartQuiz: (questions: QuizQuestion[]) => void;
}

export function QuizCreatorPanel({ onStartQuiz }: QuizCreatorPanelProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { id: "1", question: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 },
  ]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: String(prev.length + 1), question: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      )
    );
  };

  const isValid = questions.every(
    (q) => q.question.trim() && q.options.every((o) => o.trim())
  );

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {questions.map((q, qi) => (
        <div key={qi} className="glass-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Question {qi + 1}</span>
            {questions.length > 1 && (
              <button onClick={() => removeQuestion(qi)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Input
            placeholder="Enter your question..."
            value={q.question}
            onChange={(e) => updateQuestion(qi, "question", e.target.value)}
            className="text-sm"
          />
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  onClick={() => updateQuestion(qi, "correctIndex", oi)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    q.correctIndex === oi
                      ? "border-green-500 bg-green-500/20"
                      : "border-border"
                  }`}
                >
                  {q.correctIndex === oi && <Check className="w-3 h-3 text-green-500" />}
                </button>
                <Input
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  className="text-sm flex-1"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={q.timeLimit}
              onChange={(e) => updateQuestion(qi, "timeLimit", Number(e.target.value))}
              className="text-xs bg-muted rounded px-2 py-1 text-foreground"
            >
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
            </select>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addQuestion} className="flex-1">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
        </Button>
        <Button size="sm" disabled={!isValid} onClick={() => onStartQuiz(questions)} className="flex-1">
          <Play className="w-3.5 h-3.5 mr-1" /> Start Quiz
        </Button>
      </div>
    </div>
  );
}
