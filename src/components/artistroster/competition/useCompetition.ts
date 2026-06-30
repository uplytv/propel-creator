import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/** Look up the live challenge for an artist by slug (set via competitionSlug). */
export function useCompetitionBySlug(slug?: string) {
  return useQuery({
    queryKey: ["competition", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenges")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaderboard(challengeId?: string) {
  return useQuery({
    queryKey: ["competition-leaderboard", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("challenge_leaderboard", {
        _challenge_id: challengeId!,
        _limit: 100,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApprovedEntries(challengeId?: string) {
  return useQuery({
    queryKey: ["competition-entries", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenge_entries")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("is_disqualified", false)
        .eq("moderation_status", "approved")
        .order("score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEntry(entryId?: string) {
  return useQuery({
    queryKey: ["competition-entry", entryId],
    enabled: !!entryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenge_entries")
        .select("*")
        .eq("id", entryId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyFreeVotes(challengeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["competition-my-free-votes", challengeId, user?.id],
    enabled: !!challengeId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenge_votes")
        .select("entry_id")
        .eq("challenge_id", challengeId!)
        .eq("user_id", user!.id)
        .eq("is_super", false);
      if (error) throw error;
      return new Set((data ?? []).map((v) => v.entry_id as string));
    },
  });
}

export function useMyEntry(challengeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["competition-my-entry", challengeId, user?.id],
    enabled: !!challengeId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_challenge_entries")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCastFreeVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase.rpc("cast_challenge_vote", {
        _entry_id: entryId,
        _weight: 1,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["competition-entries"] });
      qc.invalidateQueries({ queryKey: ["competition-my-free-votes"] });
      qc.invalidateQueries({ queryKey: ["competition-entry"] });
    },
  });
}

export function useSuperVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entryId: string; credits: number }) => {
      const { data, error } = await supabase.rpc("super_vote_challenge_entry", {
        _entry_id: input.entryId,
        _credits: input.credits,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["competition-entries"] });
      qc.invalidateQueries({ queryKey: ["competition-entry"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export interface SubmitEntryInput {
  challenge_id: string;
  title: string;
  description?: string;
  media_url?: string | null;
  external_url?: string | null;
  artwork_url?: string | null;
  contact_email?: string | null;
  country?: string | null;
}

export function useSubmitEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: SubmitEntryInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_challenge_entries")
        .insert({ ...input, user_id: user.id, moderation_status: "pending" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-my-entry"] });
    },
  });
}

/** Upload an audio/video file under {user.id}/{challengeId}/{timestamp-name}. */
export async function uploadCompetitionMedia(
  userId: string,
  challengeId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${userId}/${challengeId}/${safeName}`;
  const { error } = await supabase.storage
    .from("competition-entries")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("competition-entries").getPublicUrl(path);
  return data.publicUrl;
}
