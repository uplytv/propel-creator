import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LyricSnippetStatus = "draft" | "refining" | "finalized" | "shelved";
export type LyricReaction = "fire" | "heart" | "genius" | "feels";
export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface LyricSnippet {
  id: string;
  artist_id: string;
  title: string;
  snippet_text: string;
  mood: string | null;
  status: LyricSnippetStatus;
  suggestion_count: number;
  reaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface LyricSnippetSuggestion {
  id: string;
  snippet_id: string;
  suggester_id: string;
  suggested_text: string;
  reasoning: string | null;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
}

export function useLyricSnippets(artistId?: string) {
  return useQuery({
    queryKey: ["music_lyric_snippets", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyric_snippets")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LyricSnippet[];
    },
  });
}

export function useLyricSuggestions(snippetId?: string) {
  return useQuery({
    queryKey: ["music_lyric_snippet_suggestions", snippetId],
    enabled: !!snippetId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyric_snippet_suggestions")
        .select("*")
        .eq("snippet_id", snippetId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LyricSnippetSuggestion[];
    },
  });
}

export function useCreateLyricSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      snippet_text: string;
      mood?: string;
      status?: LyricSnippetStatus;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("music_lyric_snippets")
        .insert({
          artist_id: uid,
          title: input.title,
          snippet_text: input.snippet_text,
          mood: input.mood ?? null,
          status: input.status ?? "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data as LyricSnippet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music_lyric_snippets"] });
    },
  });
}

export function useSubmitLyricSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      snippet_id: string;
      suggested_text: string;
      reasoning?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in to suggest");
      const { data, error } = await supabase
        .from("music_lyric_snippet_suggestions")
        .insert({
          snippet_id: input.snippet_id,
          suggester_id: uid,
          suggested_text: input.suggested_text,
          reasoning: input.reasoning ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LyricSnippetSuggestion;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music_lyric_snippet_suggestions", row.snippet_id] });
      qc.invalidateQueries({ queryKey: ["music_lyric_snippets"] });
    },
  });
}

export function useToggleLyricReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { snippet_id: string; reaction: LyricReaction; current?: LyricReaction | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in to react");
      if (input.current === input.reaction) {
        const { error } = await supabase
          .from("music_lyric_snippet_reactions")
          .delete()
          .eq("snippet_id", input.snippet_id)
          .eq("fan_id", uid);
        if (error) throw error;
      } else if (input.current) {
        const { error } = await supabase
          .from("music_lyric_snippet_reactions")
          .update({ reaction: input.reaction })
          .eq("snippet_id", input.snippet_id)
          .eq("fan_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("music_lyric_snippet_reactions")
          .insert({ snippet_id: input.snippet_id, fan_id: uid, reaction: input.reaction });
        if (error) throw error;
      }
      return input.snippet_id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music_lyric_snippets"] });
    },
  });
}
