import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SetlistStatus = "open" | "locked" | "played";

export interface SetlistCandidate {
  id: string;
  artist_id: string;
  show_label: string;
  show_date: string | null;
  track_title: string;
  track_id: string | null;
  notes: string | null;
  vote_count: number;
  status: SetlistStatus;
  created_at: string;
  updated_at: string;
}

export function useSetlistCandidates(artistId?: string, showLabel?: string) {
  return useQuery({
    queryKey: ["music-setlist-candidates", artistId, showLabel],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<SetlistCandidate[]> => {
      let q = (supabase as any)
        .from("music_setlist_candidates")
        .select("*")
        .eq("artist_id", artistId)
        .order("vote_count", { ascending: false });
      if (showLabel) q = q.eq("show_label", showLabel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SetlistCandidate[];
    },
  });
}

export function useMySetlistVotes(artistId?: string) {
  return useQuery({
    queryKey: ["music-setlist-my-votes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Set();
      const { data: cands } = await (supabase as any)
        .from("music_setlist_candidates")
        .select("id")
        .eq("artist_id", artistId);
      const ids = (cands ?? []).map((c: any) => c.id);
      if (!ids.length) return new Set();
      const { data, error } = await (supabase as any)
        .from("music_setlist_votes")
        .select("candidate_id")
        .eq("fan_id", u.user.id)
        .in("candidate_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.candidate_id));
    },
  });
}

export function useAddSetlistCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      show_label: string;
      track_title: string;
      show_date?: string | null;
      track_id?: string | null;
      notes?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_setlist_candidates")
        .insert({
          artist_id: u.user.id,
          show_label: input.show_label,
          track_title: input.track_title,
          show_date: input.show_date ?? null,
          track_id: input.track_id ?? null,
          notes: input.notes ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as SetlistCandidate;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-setlist-candidates", row.artist_id] });
    },
  });
}

export function useToggleSetlistVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { candidate_id: string; artist_id: string; voted: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (input.voted) {
        const { error } = await (supabase as any)
          .from("music_setlist_votes")
          .delete()
          .eq("candidate_id", input.candidate_id)
          .eq("fan_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_setlist_votes")
          .insert({ candidate_id: input.candidate_id, fan_id: u.user.id });
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-setlist-candidates", input.artist_id] });
      qc.invalidateQueries({ queryKey: ["music-setlist-my-votes", input.artist_id] });
    },
  });
}
