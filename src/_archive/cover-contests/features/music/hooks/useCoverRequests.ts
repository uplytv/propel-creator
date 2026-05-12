import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoverRequest {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  status: "draft" | "open" | "reviewing" | "closed";
  request_count: number;
  created_at: string;
  updated_at: string;
}

export interface CoverRequestSong {
  id: string;
  request_id: string;
  song_title: string;
  original_artist: string | null;
  notes: string | null;
  vote_count: number;
  suggested_by: string | null;
  created_at: string;
}

export interface CoverRequestVote {
  id: string;
  request_id: string;
  song_id: string;
  fan_id: string;
}

export function useCoverRequests(artistId?: string) {
  return useQuery({
    queryKey: ["cover-requests", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_cover_requests")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverRequest[];
    },
  });
}

export function useCoverRequest(id?: string) {
  return useQuery({
    queryKey: ["cover-request", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_cover_requests")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CoverRequest | null;
    },
  });
}

export function useCoverRequestSongs(requestId?: string) {
  return useQuery({
    queryKey: ["cover-request-songs", requestId],
    enabled: !!requestId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_cover_request_songs")
        .select("*")
        .eq("request_id", requestId!)
        .order("vote_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverRequestSong[];
    },
  });
}

export function useMyCoverRequestVotes(requestId?: string) {
  return useQuery({
    queryKey: ["cover-request-votes", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const fanId = auth?.user?.id;
      if (!fanId) return [] as CoverRequestVote[];
      const { data, error } = await supabase
        .from("music_cover_request_votes")
        .select("*")
        .eq("request_id", requestId!)
        .eq("fan_id", fanId);
      if (error) throw error;
      return (data ?? []) as CoverRequestVote[];
    },
  });
}

export function useAddCoverSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      song_title: string;
      original_artist?: string;
      notes?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_cover_request_songs")
        .insert({ ...input, suggested_by: uid })
        .select()
        .single();
      if (error) throw error;
      return data as CoverRequestSong;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["cover-request-songs", row.request_id] });
    },
  });
}

export function useCastCoverVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { request_id: string; song_id: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_cover_request_votes")
        .insert({ ...input, fan_id: uid });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cover-request-songs", vars.request_id] });
      qc.invalidateQueries({ queryKey: ["cover-request-votes", vars.request_id] });
      qc.invalidateQueries({ queryKey: ["cover-request", vars.request_id] });
    },
  });
}

export function useRemoveCoverVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { request_id: string; song_id: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_cover_request_votes")
        .delete()
        .eq("song_id", input.song_id)
        .eq("fan_id", uid);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cover-request-songs", vars.request_id] });
      qc.invalidateQueries({ queryKey: ["cover-request-votes", vars.request_id] });
      qc.invalidateQueries({ queryKey: ["cover-request", vars.request_id] });
    },
  });
}
