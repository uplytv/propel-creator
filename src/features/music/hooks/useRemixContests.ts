import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface RemixContest {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  stems_url: string | null;
  cover_url: string | null;
  prize_description: string | null;
  prize_amount_cents: number;
  currency: string;
  submission_deadline: string | null;
  voting_deadline: string | null;
  status: string;
  created_at: string;
}

export interface RemixSubmission {
  id: string;
  contest_id: string;
  fan_id: string;
  title: string;
  audio_url: string;
  notes: string | null;
  vote_count: number;
  status: string;
  created_at: string;
}

export function useRemixContests(artistId?: string) {
  return useQuery({
    queryKey: ["remix-contests", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_remix_contests").select("*").order("created_at", { ascending: false });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RemixContest[];
    },
    staleTime: 30_000,
  });
}

export function useRemixContest(id?: string) {
  return useQuery({
    queryKey: ["remix-contest", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_remix_contests")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as RemixContest | null;
    },
  });
}

export function useRemixSubmissions(contestId?: string) {
  return useQuery({
    queryKey: ["remix-submissions", contestId],
    enabled: !!contestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_remix_submissions")
        .select("*")
        .eq("contest_id", contestId!)
        .order("vote_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RemixSubmission[];
    },
    staleTime: 15_000,
  });
}

export function useMyRemixVote(contestId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["remix-vote", contestId, user?.id],
    enabled: !!contestId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_remix_votes")
        .select("*")
        .eq("contest_id", contestId!)
        .eq("voter_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRemixSubmission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { contest_id: string; title: string; audio_url: string; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_remix_submissions")
        .insert({
          contest_id: input.contest_id,
          fan_id: user.id,
          title: input.title,
          audio_url: input.audio_url,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["remix-submissions", vars.contest_id] });
    },
  });
}

export function useVoteForRemix() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { contest_id: string; submission_id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      // remove existing vote in contest
      await supabase
        .from("music_remix_votes")
        .delete()
        .eq("contest_id", input.contest_id)
        .eq("voter_id", user.id);
      const { data, error } = await supabase
        .from("music_remix_votes")
        .insert({
          contest_id: input.contest_id,
          submission_id: input.submission_id,
          voter_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["remix-submissions", vars.contest_id] });
      qc.invalidateQueries({ queryKey: ["remix-vote", vars.contest_id] });
    },
  });
}
