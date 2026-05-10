import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FanDemoStatus = "pending" | "reviewed" | "featured" | "declined";

export interface FanDemoSubmission {
  id: string;
  artist_id: string;
  fan_id: string;
  title: string;
  genre: string | null;
  audio_url: string;
  description: string | null;
  status: FanDemoStatus;
  artist_feedback: string | null;
  feedback_at: string | null;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export function useFanDemosForArtist(artistId?: string) {
  return useQuery({
    queryKey: ["music_fan_demo_submissions", "artist", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_demo_submissions")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FanDemoSubmission[];
    },
  });
}

export function useMyFanDemos() {
  return useQuery({
    queryKey: ["music_fan_demo_submissions", "mine"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("music_fan_demo_submissions")
        .select("*")
        .eq("fan_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FanDemoSubmission[];
    },
  });
}

export function useSubmitFanDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      title: string;
      audio_url: string;
      genre?: string;
      description?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in to submit a demo");
      const { data, error } = await supabase
        .from("music_fan_demo_submissions")
        .insert({
          artist_id: input.artist_id,
          fan_id: uid,
          title: input.title,
          audio_url: input.audio_url,
          genre: input.genre ?? null,
          description: input.description ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FanDemoSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music_fan_demo_submissions"] });
    },
  });
}

export function useReviewFanDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: FanDemoStatus;
      artist_feedback?: string;
    }) => {
      const { data, error } = await supabase
        .from("music_fan_demo_submissions")
        .update({
          status: input.status,
          artist_feedback: input.artist_feedback ?? null,
          feedback_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as FanDemoSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music_fan_demo_submissions"] });
    },
  });
}

export function useRecordDemoPlay() {
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { error } = await supabase
        .from("music_fan_demo_plays")
        .insert({ submission_id: submissionId, listener_id: uid });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw error;
      }
      return submissionId;
    },
  });
}
