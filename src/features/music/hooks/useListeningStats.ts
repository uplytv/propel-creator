import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeviceType = "mobile" | "desktop" | "tablet" | "tv" | "other";

export interface ListeningSession {
  id: string;
  artist_id: string;
  track_id: string;
  fan_id: string;
  duration_seconds: number;
  completed: boolean;
  device_type: DeviceType;
  created_at: string;
}

export function useListeningSessions(artistId?: string) {
  return useQuery({
    queryKey: ["music-listening-sessions", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<ListeningSession[]> => {
      const { data, error } = await supabase
        .from("music_listening_sessions")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ListeningSession[];
    },
  });
}

export function useMyListeningSessions(trackId?: string) {
  return useQuery({
    queryKey: ["music-my-listening-sessions", trackId],
    enabled: !!trackId,
    staleTime: 15_000,
    queryFn: async (): Promise<ListeningSession[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("music_listening_sessions")
        .select("*")
        .eq("track_id", trackId)
        .eq("fan_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListeningSession[];
    },
  });
}

export interface TopListener {
  fan_id: string;
  total_seconds: number;
  sessions: number;
  completed: number;
}

export function useTopListeners(artistId?: string, limit = 10) {
  return useQuery({
    queryKey: ["music-top-listeners", artistId, limit],
    enabled: !!artistId,
    staleTime: 60_000,
    queryFn: async (): Promise<TopListener[]> => {
      const { data, error } = await supabase
        .from("music_listening_sessions")
        .select("fan_id,duration_seconds,completed")
        .eq("artist_id", artistId)
        .limit(2000);
      if (error) throw error;
      const map = new Map<string, TopListener>();
      for (const row of (data ?? []) as Array<{ fan_id: string; duration_seconds: number; completed: boolean }>) {
        const existing = map.get(row.fan_id) ?? { fan_id: row.fan_id, total_seconds: 0, sessions: 0, completed: 0 };
        existing.total_seconds += row.duration_seconds || 0;
        existing.sessions += 1;
        if (row.completed) existing.completed += 1;
        map.set(row.fan_id, existing);
      }
      return Array.from(map.values())
        .sort((a, b) => b.total_seconds - a.total_seconds)
        .slice(0, limit);
    },
  });
}

export function useLogListeningSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      track_id: string;
      duration_seconds: number;
      completed?: boolean;
      device_type?: DeviceType;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_listening_sessions")
        .insert({
          artist_id: input.artist_id,
          track_id: input.track_id,
          fan_id: u.user.id,
          duration_seconds: Math.max(0, Math.floor(input.duration_seconds)),
          completed: !!input.completed,
          device_type: input.device_type ?? "other",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ListeningSession;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-listening-sessions", row.artist_id] });
      qc.invalidateQueries({ queryKey: ["music-my-listening-sessions", row.track_id] });
      qc.invalidateQueries({ queryKey: ["music-top-listeners", row.artist_id] });
    },
  });
}
