import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StemKind = "drums" | "bass" | "vocals" | "melody" | "fx" | "other";

export function useStemStations(artistId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["stem-stations", artistId, opts?.includeDrafts],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("music_stem_stations")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (!opts?.includeDrafts) q = q.eq("status", "published");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStemStation(id?: string) {
  return useQuery({
    queryKey: ["stem-station", id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_stem_stations")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStemTracks(stationId?: string) {
  return useQuery({
    queryKey: ["stem-tracks", stationId],
    enabled: !!stationId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_stem_tracks")
        .select("*")
        .eq("station_id", stationId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateStemStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      bpm?: number;
      music_key?: string;
      cover_url?: string;
      status?: "draft" | "published" | "archived";
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_stem_stations")
        .insert({ ...input, artist_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stem-stations"] }),
  });
}

export function useAddStemTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      station_id: string;
      kind: StemKind;
      label: string;
      audio_url: string;
      duration_seconds?: number;
      position?: number;
    }) => {
      const { data, error } = await supabase
        .from("music_stem_tracks")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["stem-tracks", vars.station_id] });
    },
  });
}

export function useRecordStemDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { station_id: string; stem_id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_stem_downloads")
        .insert({ ...input, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["stem-station", vars.station_id] });
      qc.invalidateQueries({ queryKey: ["stem-stations"] });
    },
  });
}
