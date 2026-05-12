import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MailbagStatus = "pending" | "answered" | "hidden";

export interface MailbagQuestion {
  id: string;
  artist_id: string;
  fan_id: string;
  question: string;
  answer: string | null;
  status: MailbagStatus;
  upvote_count: number;
  is_pinned: boolean;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMailbag(artistId?: string, status?: MailbagStatus) {
  return useQuery({
    queryKey: ["music-mailbag", artistId, status],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<MailbagQuestion[]> => {
      let q = (supabase as any)
        .from("music_mailbag_questions")
        .select("*")
        .eq("artist_id", artistId)
        .order("is_pinned", { ascending: false })
        .order("upvote_count", { ascending: false })
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MailbagQuestion[];
    },
  });
}

export function useMyMailbagUpvotes(artistId?: string) {
  return useQuery({
    queryKey: ["music-mailbag-my-upvotes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Set();
      const { data: qs } = await (supabase as any)
        .from("music_mailbag_questions")
        .select("id")
        .eq("artist_id", artistId);
      const ids = (qs ?? []).map((r: any) => r.id);
      if (!ids.length) return new Set();
      const { data, error } = await (supabase as any)
        .from("music_mailbag_upvotes")
        .select("question_id")
        .eq("fan_id", u.user.id)
        .in("question_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.question_id));
    },
  });
}

export function useSubmitMailbag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { artist_id: string; question: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_mailbag_questions")
        .insert({
          artist_id: input.artist_id,
          fan_id: u.user.id,
          question: input.question,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as MailbagQuestion;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-mailbag", row.artist_id] });
    },
  });
}

export function useToggleMailbagUpvote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; artist_id: string; voted: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (input.voted) {
        const { error } = await (supabase as any)
          .from("music_mailbag_upvotes")
          .delete()
          .eq("question_id", input.question_id)
          .eq("fan_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_mailbag_upvotes")
          .insert({ question_id: input.question_id, fan_id: u.user.id });
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-mailbag", input.artist_id] });
      qc.invalidateQueries({ queryKey: ["music-mailbag-my-upvotes", input.artist_id] });
    },
  });
}

export function useAnswerMailbag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      artist_id: string;
      answer: string;
      pin?: boolean;
    }) => {
      const { data, error } = await (supabase as any)
        .from("music_mailbag_questions")
        .update({
          answer: input.answer,
          status: "answered",
          answered_at: new Date().toISOString(),
          ...(input.pin !== undefined ? { is_pinned: input.pin } : {}),
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as MailbagQuestion;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-mailbag", row.artist_id] });
    },
  });
}

export function useHideMailbag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; artist_id: string }) => {
      const { error } = await (supabase as any)
        .from("music_mailbag_questions")
        .update({ status: "hidden" })
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-mailbag", input.artist_id] });
    },
  });
}
