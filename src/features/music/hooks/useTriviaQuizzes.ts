import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QuizStatus = "draft" | "published" | "closed";

export interface TriviaQuiz {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  time_limit_seconds: number | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface TriviaQuestion {
  id: string;
  quiz_id: string;
  position: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  points: number;
  created_at: string;
}

export interface TriviaAttempt {
  id: string;
  quiz_id: string;
  fan_id: string;
  score: number;
  total_points: number;
  duration_seconds: number;
  created_at: string;
}

export function useTriviaQuizzes(artistId?: string) {
  return useQuery({
    queryKey: ["music-trivia-quizzes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<TriviaQuiz[]> => {
      const { data, error } = await (supabase as any)
        .from("music_trivia_quizzes")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TriviaQuiz[];
    },
  });
}

export function useTriviaQuiz(id?: string) {
  return useQuery({
    queryKey: ["music-trivia-quiz", id],
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async (): Promise<TriviaQuiz | null> => {
      const { data, error } = await (supabase as any)
        .from("music_trivia_quizzes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TriviaQuiz | null;
    },
  });
}

export function useTriviaQuestions(quizId?: string) {
  return useQuery({
    queryKey: ["music-trivia-questions", quizId],
    enabled: !!quizId,
    staleTime: 30_000,
    queryFn: async (): Promise<TriviaQuestion[]> => {
      const { data, error } = await (supabase as any)
        .from("music_trivia_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TriviaQuestion[];
    },
  });
}

export function useTriviaLeaderboard(quizId?: string, limit = 25) {
  return useQuery({
    queryKey: ["music-trivia-leaderboard", quizId, limit],
    enabled: !!quizId,
    staleTime: 15_000,
    queryFn: async (): Promise<TriviaAttempt[]> => {
      const { data, error } = await (supabase as any)
        .from("music_trivia_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .order("score", { ascending: false })
        .order("duration_seconds", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TriviaAttempt[];
    },
  });
}

export function useSubmitTriviaAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      quiz_id: string;
      score: number;
      total_points: number;
      duration_seconds: number;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_trivia_attempts")
        .insert({
          quiz_id: input.quiz_id,
          fan_id: u.user.id,
          score: Math.max(0, Math.floor(input.score)),
          total_points: Math.max(0, Math.floor(input.total_points)),
          duration_seconds: Math.max(0, Math.floor(input.duration_seconds)),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as TriviaAttempt;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-trivia-leaderboard", row.quiz_id] });
      qc.invalidateQueries({ queryKey: ["music-trivia-quiz", row.quiz_id] });
    },
  });
}
