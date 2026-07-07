import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface QAQuestion {
  id: string;
  artist_id: string;
  fan_id: string;
  body: string;
  is_anonymous: boolean;
  status: "pending" | "answered" | "hidden";
  upvotes: number;
  created_at: string;
}

export interface QAAnswer {
  id: string;
  question_id: string;
  artist_id: string;
  body: string;
  created_at: string;
}

export function useQAQuestions(artistId?: string, opts?: { status?: QAQuestion["status"] | "all" }) {
  const status = opts?.status ?? "answered";
  return useQuery({
    queryKey: ["qa-questions", artistId, status],
    enabled: !!artistId,
    queryFn: async () => {
      let q = supabase
        .from("music_artist_qa_questions")
        .select("*")
        .eq("artist_id", artistId!)
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QAQuestion[];
    },
    staleTime: 30_000,
  });
}

export function useQAAnswer(questionId?: string) {
  return useQuery({
    queryKey: ["qa-answer", questionId],
    enabled: !!questionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_qa_answers")
        .select("*")
        .eq("question_id", questionId!)
        .maybeSingle();
      if (error) throw error;
      return data as QAAnswer | null;
    },
  });
}

export function useMyQAUpvote(questionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qa-upvote-mine", questionId, user?.id],
    enabled: !!questionId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_qa_upvotes")
        .select("id")
        .eq("question_id", questionId!)
        .eq("voter_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useSubmitQAQuestion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { artist_id: string; body: string; is_anonymous?: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_artist_qa_questions")
        .insert({
          artist_id: input.artist_id,
          fan_id: user.id,
          body: input.body,
          is_anonymous: input.is_anonymous ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as QAQuestion;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["qa-questions", vars.artist_id] });
    },
  });
}

export function useToggleQAUpvote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { question_id: string; on: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (input.on) {
        const { error } = await supabase
          .from("music_artist_qa_upvotes")
          .insert({ question_id: input.question_id, voter_id: user.id });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("music_artist_qa_upvotes")
          .delete()
          .eq("question_id", input.question_id)
          .eq("voter_id", user.id);
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["qa-upvote-mine", vars.question_id] });
      qc.invalidateQueries({ queryKey: ["qa-questions"] });
    },
  });
}

export function useAnswerQAQuestion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { question_id: string; body: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_artist_qa_answers")
        .insert({
          question_id: input.question_id,
          artist_id: user.id,
          body: input.body,
        })
        .select()
        .single();
      if (error) throw error;
      return data as QAAnswer;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["qa-answer", vars.question_id] });
      qc.invalidateQueries({ queryKey: ["qa-questions"] });
    },
  });
}

export function useUpdateQAQuestionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: QAQuestion["status"] }) => {
      const { error } = await supabase
        .from("music_artist_qa_questions")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-questions"] });
    },
  });
}
