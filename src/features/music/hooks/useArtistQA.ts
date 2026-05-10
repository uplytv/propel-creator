import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQAThreads(artistId?: string) {
  return useQuery({
    queryKey: ["music_qa_threads", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_qa_threads")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useQAThread(id?: string) {
  return useQuery({
    queryKey: ["music_qa_thread", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_qa_threads")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useQAQuestions(threadId?: string) {
  return useQuery({
    queryKey: ["music_qa_questions", threadId],
    enabled: !!threadId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_qa_questions")
        .select("*")
        .eq("thread_id", threadId!)
        .order("upvote_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyQAVotes(threadId?: string) {
  return useQuery({
    queryKey: ["music_qa_my_votes", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return new Set<string>();
      const { data: qs } = await supabase
        .from("music_qa_questions")
        .select("id")
        .eq("thread_id", threadId!);
      const ids = (qs ?? []).map((q: any) => q.id);
      if (!ids.length) return new Set<string>();
      const { data, error } = await supabase
        .from("music_qa_question_votes")
        .select("question_id")
        .eq("voter_id", uid)
        .in("question_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((v: any) => v.question_id));
    },
  });
}

export function useCreateQAThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { artist_id: string; title: string; description?: string; status?: string }) => {
      const { data, error } = await supabase
        .from("music_qa_threads")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row: any) => qc.invalidateQueries({ queryKey: ["music_qa_threads", row.artist_id] }),
  });
}

export function useAskQAQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_qa_questions")
        .insert({ ...input, asker_id: uid } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["music_qa_questions", row.thread_id] });
      qc.invalidateQueries({ queryKey: ["music_qa_thread", row.thread_id] });
    },
  });
}

export function useAnswerQAQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; thread_id: string; answer_body: string }) => {
      const { data, error } = await supabase
        .from("music_qa_questions")
        .update({ answer_body: input.answer_body, answered_at: new Date().toISOString(), status: "answered" } as any)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["music_qa_questions", vars.thread_id] }),
  });
}

export function useVoteQAQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; thread_id: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("music_qa_question_votes")
        .insert({ question_id: input.question_id, voter_id: uid } as any);
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_qa_questions", vars.thread_id] });
      qc.invalidateQueries({ queryKey: ["music_qa_my_votes", vars.thread_id] });
    },
  });
}

export function useUnvoteQAQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; thread_id: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("music_qa_question_votes")
        .delete()
        .eq("question_id", input.question_id)
        .eq("voter_id", uid);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_qa_questions", vars.thread_id] });
      qc.invalidateQueries({ queryKey: ["music_qa_my_votes", vars.thread_id] });
    },
  });
}
