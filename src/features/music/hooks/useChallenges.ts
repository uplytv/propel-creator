import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChallenges(status: string = "active") {
  return useQuery({
    queryKey: ["music-challenges", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenges")
        .select("*")
        .eq("status", status)
        .order("submission_deadline", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChallenge(id?: string) {
  return useQuery({
    queryKey: ["music-challenge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenges")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useChallengeEntries(challengeId?: string) {
  return useQuery({
    queryKey: ["music-challenge-entries", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenge_entries")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("is_disqualified", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChallengeLeaderboard(challengeId?: string) {
  return useQuery({
    queryKey: ["music-challenge-leaderboard", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("challenge_leaderboard", {
        _challenge_id: challengeId!,
        _limit: 50,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyChallengeVotes(challengeId?: string) {
  return useQuery({
    queryKey: ["music-challenge-my-votes", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_challenge_votes")
        .select("entry_id")
        .eq("challenge_id", challengeId!)
        .eq("user_id", auth.user.id);
      if (error) throw error;
      return (data ?? []).map((v) => v.entry_id);
    },
  });
}

export function useSubmitChallengeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      challenge_id: string;
      title: string;
      description?: string;
      media_url: string;
      artwork_url?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_challenge_entries")
        .insert({ ...input, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["music-challenge-entries", d.challenge_id] });
      qc.invalidateQueries({ queryKey: ["music-challenge", d.challenge_id] });
    },
  });
}

export function useCastChallengeVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entry_id: string; weight?: number }) => {
      const { data, error } = await supabase.rpc("cast_challenge_vote", {
        _entry_id: input.entry_id,
        _weight: input.weight ?? 1.0,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, _v) => {
      qc.invalidateQueries({ queryKey: ["music-challenge-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["music-challenge-entries"] });
      qc.invalidateQueries({ queryKey: ["music-challenge-my-votes"] });
    },
  });
}
