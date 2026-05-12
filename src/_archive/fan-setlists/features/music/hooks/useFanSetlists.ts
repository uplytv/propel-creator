import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FanSetlistStatus = "draft" | "voting" | "closed";

export interface FanSetlist {
  id: string;
  artist_id: string;
  show_title: string;
  show_date: string | null;
  venue: string | null;
  description: string | null;
  status: FanSetlistStatus;
  max_votes_per_fan: number;
  vote_count: number;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FanSetlistSong {
  id: string;
  setlist_id: string;
  title: string;
  artist_label: string | null;
  album: string | null;
  position: number;
  vote_count: number;
}

export interface FanSetlistVote {
  id: string;
  setlist_id: string;
  song_id: string;
  fan_id: string;
  created_at: string;
}

export function useFanSetlists(artistId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["music_fan_setlists", artistId, opts?.includeDrafts ?? false],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("music_fan_setlists" as any)
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (!opts?.includeDrafts) q = q.neq("status", "draft");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FanSetlist[];
    },
  });
}

export function useFanSetlist(id?: string) {
  return useQuery({
    queryKey: ["music_fan_setlist", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_setlists" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FanSetlist | null;
    },
  });
}

export function useFanSetlistSongs(setlistId?: string) {
  return useQuery({
    queryKey: ["music_fan_setlist_songs", setlistId],
    enabled: !!setlistId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_setlist_songs" as any)
        .select("*")
        .eq("setlist_id", setlistId!)
        .order("vote_count", { ascending: false })
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FanSetlistSong[];
    },
  });
}

export function useMyFanSetlistVotes(setlistId?: string) {
  return useQuery({
    queryKey: ["music_fan_setlist_my_votes", setlistId],
    enabled: !!setlistId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as FanSetlistVote[];
      const { data, error } = await supabase
        .from("music_fan_setlist_votes" as any)
        .select("*")
        .eq("setlist_id", setlistId!)
        .eq("fan_id", u.user.id);
      if (error) throw error;
      return (data ?? []) as unknown as FanSetlistVote[];
    },
  });
}

export function useCastFanSetlistVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ setlistId, songId }: { setlistId: string; songId: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_fan_setlist_votes" as any)
        .insert({ setlist_id: setlistId, song_id: songId, fan_id: u.user.id } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_fan_setlist_songs", vars.setlistId] });
      qc.invalidateQueries({ queryKey: ["music_fan_setlist_my_votes", vars.setlistId] });
      qc.invalidateQueries({ queryKey: ["music_fan_setlist", vars.setlistId] });
    },
  });
}

export function useRemoveFanSetlistVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ setlistId, songId }: { setlistId: string; songId: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_fan_setlist_votes" as any)
        .delete()
        .eq("setlist_id", setlistId)
        .eq("song_id", songId)
        .eq("fan_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_fan_setlist_songs", vars.setlistId] });
      qc.invalidateQueries({ queryKey: ["music_fan_setlist_my_votes", vars.setlistId] });
      qc.invalidateQueries({ queryKey: ["music_fan_setlist", vars.setlistId] });
    },
  });
}
