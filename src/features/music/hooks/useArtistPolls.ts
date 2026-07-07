import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ArtistPoll {
  id: string;
  artist_id: string;
  question: string;
  description: string | null;
  status: "open" | "closed";
  closes_at: string | null;
  total_votes: number;
}

export interface ArtistPollOption {
  id: string;
  poll_id: string;
  label: string;
  image_url: string | null;
  position: number;
  vote_count: number;
}

export interface ArtistPollVote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
}

export function useArtistPolls(artistId?: string) {
  return useQuery({
    queryKey: ["artist-polls", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_artist_polls").select("*").order("created_at", { ascending: false });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ArtistPoll[];
    },
    staleTime: 30_000,
  });
}

export function useArtistPoll(id?: string) {
  return useQuery({
    queryKey: ["artist-poll", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_polls")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as ArtistPoll | null;
    },
  });
}

export function useArtistPollOptions(pollId?: string) {
  return useQuery({
    queryKey: ["artist-poll-options", pollId],
    enabled: !!pollId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_poll_options")
        .select("*")
        .eq("poll_id", pollId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ArtistPollOption[];
    },
    staleTime: 15_000,
  });
}

export function useMyArtistPollVote(pollId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["artist-poll-vote-mine", pollId, user?.id],
    enabled: !!pollId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_artist_poll_votes")
        .select("*")
        .eq("poll_id", pollId!)
        .eq("voter_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ArtistPollVote | null;
    },
  });
}

export function useCastArtistPollVote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { poll_id: string; option_id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      // Remove any existing vote first (one per poll per voter)
      await supabase
        .from("music_artist_poll_votes")
        .delete()
        .eq("poll_id", input.poll_id)
        .eq("voter_id", user.id);
      const { data, error } = await supabase
        .from("music_artist_poll_votes")
        .insert({
          poll_id: input.poll_id,
          option_id: input.option_id,
          voter_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ArtistPollVote;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["artist-poll", vars.poll_id] });
      qc.invalidateQueries({ queryKey: ["artist-poll-options", vars.poll_id] });
      qc.invalidateQueries({ queryKey: ["artist-poll-vote-mine", vars.poll_id] });
    },
  });
}
