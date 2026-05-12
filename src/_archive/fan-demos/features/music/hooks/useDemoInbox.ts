import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DemoStatus = "pending" | "listened" | "shortlisted" | "passed";

export interface DemoSubmission {
  id: string;
  artist_id: string;
  fan_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  genre: string | null;
  duration_seconds: number;
  status: DemoStatus;
  feedback: string | null;
  rating: number | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export function useArtistDemoInbox(artistId?: string, status?: DemoStatus) {
  return useQuery({
    queryKey: ["music-demo-inbox", artistId, status],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<DemoSubmission[]> => {
      let q = (supabase as any)
        .from("music_demo_submissions")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DemoSubmission[];
    },
  });
}

export function useMyDemoSubmissions() {
  return useQuery({
    queryKey: ["music-my-demo-submissions"],
    staleTime: 30_000,
    queryFn: async (): Promise<DemoSubmission[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await (supabase as any)
        .from("music_demo_submissions")
        .select("*")
        .eq("fan_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DemoSubmission[];
    },
  });
}

export function useSubmitDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      title: string;
      audio_url: string;
      description?: string;
      genre?: string;
      duration_seconds?: number;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_demo_submissions")
        .insert({
          artist_id: input.artist_id,
          fan_id: u.user.id,
          title: input.title,
          audio_url: input.audio_url,
          description: input.description ?? null,
          genre: input.genre ?? null,
          duration_seconds: Math.max(0, Math.floor(input.duration_seconds ?? 0)),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as DemoSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-my-demo-submissions"] });
      qc.invalidateQueries({ queryKey: ["music-demo-inbox"] });
    },
  });
}

export function useReviewDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: DemoStatus;
      feedback?: string;
      rating?: number;
      is_featured?: boolean;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status) patch.status = input.status;
      if (input.feedback !== undefined) patch.feedback = input.feedback;
      if (input.rating !== undefined) patch.rating = input.rating;
      if (input.is_featured !== undefined) patch.is_featured = input.is_featured;
      const { data, error } = await (supabase as any)
        .from("music_demo_submissions")
        .update(patch)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as DemoSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-demo-inbox"] });
      qc.invalidateQueries({ queryKey: ["music-my-demo-submissions"] });
    },
  });
}
