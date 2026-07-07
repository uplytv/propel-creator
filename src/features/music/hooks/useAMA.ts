import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface AMASession {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  scheduled_for: string;
  ends_at: string | null;
  status: "draft" | "scheduled" | "live" | "ended" | "canceled";
  created_at: string;
}

export interface AMAQuestion {
  id: string;
  session_id: string;
  fan_id: string;
  question: string;
  upvote_count: number;
  is_answered: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export function useAMASessions(artistId?: string) {
  return useQuery({
    queryKey: ["ama-sessions", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_ama_sessions").select("*").order("scheduled_for", { ascending: true });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AMASession[];
    },
    staleTime: 30_000,
  });
}

export function useAMASession(id?: string) {
  return useQuery({
    queryKey: ["ama-session", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_ama_sessions")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as AMASession | null;
    },
  });
}

export function useAMAQuestions(sessionId?: string) {
  return useQuery({
    queryKey: ["ama-questions", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_ama_questions")
        .select("*")
        .eq("session_id", sessionId!)
        .order("upvote_count", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AMAQuestion[];
    },
    staleTime: 15_000,
  });
}

export function useMyAMAVotes(sessionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ama-my-votes", sessionId, user?.id],
    enabled: !!sessionId && !!user?.id,
    queryFn: async () => {
      const { data: questions } = await supabase
        .from("music_ama_questions")
        .select("id")
        .eq("session_id", sessionId!);
      const ids = (questions ?? []).map((q: any) => q.id);
      if (ids.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("music_ama_question_votes")
        .select("question_id")
        .eq("voter_id", user!.id)
        .in("question_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((v: any) => v.question_id as string));
    },
  });
}

export function useSubmitAMAQuestion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { session_id: string; question: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_ama_questions")
        .insert({ session_id: input.session_id, fan_id: user.id, question: input.question })
        .select()
        .single();
      if (error) throw error;
      return data as AMAQuestion;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ama-questions", vars.session_id] });
    },
  });
}

export function useToggleAMAVote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { question_id: string; session_id: string; voted: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (input.voted) {
        const { error } = await supabase
          .from("music_ama_question_votes")
          .delete()
          .eq("question_id", input.question_id)
          .eq("voter_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("music_ama_question_votes")
          .insert({ question_id: input.question_id, voter_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ama-questions", vars.session_id] });
      qc.invalidateQueries({ queryKey: ["ama-my-votes", vars.session_id] });
    },
  });
}

export function useAnswerAMAQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; session_id: string; answer: string }) => {
      const { error } = await supabase
        .from("music_ama_questions")
        .update({ answer: input.answer, is_answered: true, answered_at: new Date().toISOString() })
        .eq("id", input.question_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ama-questions", vars.session_id] });
    },
  });
}
