import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface CoverContest {
  id: string;
  artist_id: string;
  track_title: string;
  prompt: string | null;
  prize: string | null;
  status: "open" | "judging" | "closed";
  submission_deadline: string | null;
  max_submissions: number | null;
  created_at: string;
}

export interface CoverSubmission {
  id: string;
  contest_id: string;
  fan_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: "submitted" | "finalist" | "winner" | "disqualified";
  like_count: number;
  created_at: string;
}

export function useCoverContests(artistId?: string) {
  return useQuery({
    queryKey: ["cover-contests", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_cover_contests").select("*").order("created_at", { ascending: false });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CoverContest[];
    },
    staleTime: 30_000,
  });
}

export function useCoverContest(id?: string) {
  return useQuery({
    queryKey: ["cover-contest", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_cover_contests")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CoverContest | null;
    },
  });
}

export function useCoverSubmissions(contestId?: string) {
  return useQuery({
    queryKey: ["cover-submissions", contestId],
    enabled: !!contestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_cover_submissions")
        .select("*")
        .eq("contest_id", contestId!)
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverSubmission[];
    },
    staleTime: 15_000,
  });
}

export function useMyCoverLike(submissionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cover-like-mine", submissionId, user?.id],
    enabled: !!submissionId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_cover_submission_likes")
        .select("id")
        .eq("submission_id", submissionId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useSubmitCover() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      contest_id: string;
      video_url: string;
      thumbnail_url?: string;
      caption?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_cover_submissions")
        .insert({
          contest_id: input.contest_id,
          fan_id: user.id,
          video_url: input.video_url,
          thumbnail_url: input.thumbnail_url ?? null,
          caption: input.caption ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CoverSubmission;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cover-submissions", vars.contest_id] });
    },
  });
}

export function useToggleCoverLike() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { submission_id: string; on: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (input.on) {
        const { error } = await (supabase as any)
          .from("music_cover_submission_likes")
          .insert({ submission_id: input.submission_id, fan_id: user.id });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("music_cover_submission_likes")
          .delete()
          .eq("submission_id", input.submission_id)
          .eq("fan_id", user.id);
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cover-like-mine", vars.submission_id] });
      qc.invalidateQueries({ queryKey: ["cover-submissions"] });
    },
  });
}

export function useUpdateCoverSubmissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: CoverSubmission["status"] }) => {
      const { error } = await supabase
        .from("music_cover_submissions")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cover-submissions"] }),
  });
}
