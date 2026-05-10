import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FanSpotlight {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed";
  submission_count: number;
  featured_count: number;
  created_at: string;
  updated_at: string;
}

export interface FanSpotlightSubmission {
  id: string;
  spotlight_id: string;
  fan_id: string;
  media_type: "cover" | "remix" | "art" | "video";
  media_url: string;
  title: string | null;
  caption: string | null;
  like_count: number;
  is_featured: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function useFanSpotlights(artistId?: string) {
  return useQuery({
    queryKey: ["fan-spotlights", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_spotlights")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FanSpotlight[];
    },
  });
}

export function useFanSpotlight(id?: string) {
  return useQuery({
    queryKey: ["fan-spotlight", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_spotlights")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as FanSpotlight | null;
    },
  });
}

export function useFanSpotlightSubmissions(
  spotlightId?: string,
  opts?: { onlyApproved?: boolean }
) {
  return useQuery({
    queryKey: ["fan-spotlight-submissions", spotlightId, opts?.onlyApproved],
    enabled: !!spotlightId,
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("music_fan_spotlight_submissions")
        .select("*")
        .eq("spotlight_id", spotlightId!)
        .order("is_featured", { ascending: false })
        .order("like_count", { ascending: false });
      if (opts?.onlyApproved) q = q.eq("status", "approved");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FanSpotlightSubmission[];
    },
  });
}

export function useSubmitFanSpotlight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      spotlight_id: string;
      media_type: FanSpotlightSubmission["media_type"];
      media_url: string;
      title?: string;
      caption?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_fan_spotlight_submissions")
        .insert({ ...input, fan_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data as FanSpotlightSubmission;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["fan-spotlight-submissions", row.spotlight_id] });
      qc.invalidateQueries({ queryKey: ["fan-spotlight", row.spotlight_id] });
    },
  });
}

export function useReviewFanSpotlightSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      spotlight_id: string;
      status?: FanSpotlightSubmission["status"];
      is_featured?: boolean;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.is_featured !== undefined) patch.is_featured = input.is_featured;
      const { error } = await supabase
        .from("music_fan_spotlight_submissions")
        .update(patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["fan-spotlight-submissions", vars.spotlight_id] });
      qc.invalidateQueries({ queryKey: ["fan-spotlight", vars.spotlight_id] });
    },
  });
}

export function useToggleSpotlightLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { submission_id: string; spotlight_id: string; liked: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      if (input.liked) {
        const { error } = await supabase
          .from("music_fan_spotlight_likes")
          .delete()
          .eq("submission_id", input.submission_id)
          .eq("fan_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("music_fan_spotlight_likes")
          .insert({ submission_id: input.submission_id, fan_id: uid });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["fan-spotlight-submissions", vars.spotlight_id] });
      qc.invalidateQueries({ queryKey: ["my-spotlight-likes", vars.spotlight_id] });
    },
  });
}

export function useMySpotlightLikes(spotlightId?: string) {
  return useQuery({
    queryKey: ["my-spotlight-likes", spotlightId],
    enabled: !!spotlightId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return [] as string[];
      const { data, error } = await supabase
        .from("music_fan_spotlight_likes")
        .select("submission_id, music_fan_spotlight_submissions!inner(spotlight_id)")
        .eq("fan_id", uid)
        .eq("music_fan_spotlight_submissions.spotlight_id", spotlightId!);
      if (error) throw error;
      return (data ?? []).map((r: { submission_id: string }) => r.submission_id);
    },
  });
}
