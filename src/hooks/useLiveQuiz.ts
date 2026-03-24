import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number; // seconds
}

export interface QuizParticipant {
  userId: string;
  displayName: string;
  score: number;
  streak: number;
}

export interface QuizState {
  status: "idle" | "question" | "results" | "leaderboard";
  currentQuestion: QuizQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  participants: QuizParticipant[];
  userAnswer: number | null;
  isCorrect: boolean | null;
}

export function useLiveQuiz(streamId: string | undefined, isCreator: boolean) {
  const [quiz, setQuiz] = useState<QuizState>({
    status: "idle",
    currentQuestion: null,
    questionIndex: 0,
    totalQuestions: 0,
    timeRemaining: 0,
    participants: [],
    userAnswer: null,
    isCorrect: null,
  });

  const channelRef = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!streamId) return;
    const channel = supabase.channel(`quiz-${streamId}`);

    channel
      .on("broadcast", { event: "quiz_question" }, ({ payload }) => {
        setQuiz((prev) => ({
          ...prev,
          status: "question",
          currentQuestion: payload.question,
          questionIndex: payload.questionIndex,
          totalQuestions: payload.totalQuestions,
          timeRemaining: payload.question.timeLimit,
          userAnswer: null,
          isCorrect: null,
        }));
      })
      .on("broadcast", { event: "quiz_results" }, ({ payload }) => {
        setQuiz((prev) => ({
          ...prev,
          status: "results",
          isCorrect: prev.userAnswer === payload.correctIndex,
          participants: payload.leaderboard || prev.participants,
        }));
      })
      .on("broadcast", { event: "quiz_leaderboard" }, ({ payload }) => {
        setQuiz((prev) => ({
          ...prev,
          status: "leaderboard",
          participants: payload.leaderboard,
        }));
      })
      .on("broadcast", { event: "quiz_end" }, () => {
        setQuiz((prev) => ({ ...prev, status: "idle", currentQuestion: null }));
      })
      .subscribe();

    channelRef[1](channel);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Timer countdown
  useEffect(() => {
    if (quiz.status !== "question" || quiz.timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setQuiz((prev) => {
        if (prev.timeRemaining <= 1) {
          clearInterval(interval);
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quiz.status, quiz.currentQuestion?.id]);

  const startQuiz = useCallback(
    (questions: QuizQuestion[]) => {
      if (!channelRef[0] || !isCreator) return;
      const first = questions[0];
      channelRef[0].send({
        type: "broadcast",
        event: "quiz_question",
        payload: { question: first, questionIndex: 0, totalQuestions: questions.length },
      });
    },
    [isCreator]
  );

  const sendQuestion = useCallback(
    (question: QuizQuestion, index: number, total: number) => {
      channelRef[0]?.send({
        type: "broadcast",
        event: "quiz_question",
        payload: { question, questionIndex: index, totalQuestions: total },
      });
    },
    []
  );

  const submitAnswer = useCallback(
    (answerIndex: number) => {
      setQuiz((prev) => ({ ...prev, userAnswer: answerIndex }));
      channelRef[0]?.send({
        type: "broadcast",
        event: "quiz_answer",
        payload: { answerIndex, questionId: quiz.currentQuestion?.id },
      });
    },
    [quiz.currentQuestion?.id]
  );

  const showResults = useCallback(
    (correctIndex: number, leaderboard: QuizParticipant[]) => {
      channelRef[0]?.send({
        type: "broadcast",
        event: "quiz_results",
        payload: { correctIndex, leaderboard },
      });
    },
    []
  );

  const showLeaderboard = useCallback(
    (leaderboard: QuizParticipant[]) => {
      channelRef[0]?.send({
        type: "broadcast",
        event: "quiz_leaderboard",
        payload: { leaderboard },
      });
    },
    []
  );

  const endQuiz = useCallback(() => {
    channelRef[0]?.send({ type: "broadcast", event: "quiz_end", payload: {} });
    setQuiz((prev) => ({ ...prev, status: "idle", currentQuestion: null }));
  }, []);

  return {
    quiz,
    startQuiz,
    sendQuestion,
    submitAnswer,
    showResults,
    showLeaderboard,
    endQuiz,
  };
}
