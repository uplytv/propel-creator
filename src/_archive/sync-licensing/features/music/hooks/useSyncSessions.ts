import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SyncStatus = "scheduled" | "live" | "ended" | "cancelled";
export type RsvpStatus = "going" | "maybe" | "cant";

export interface SyncSession {
  id: string;
  host_id: string;
  artist_id: string | null;
  title: string;
  cover_url: string | null;
  spotify_url: string | null;
  album_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  host_message: string | null;
  going_count: number;
  status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface SyncAttendee {
  id: string;
  session_id: string;
  fan_id: string;
  rsvp: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export function useUpcomingSyncSessions(artistId?: string) {
  return useQuery({
    queryKey: ["music-sync-sessions", artistId ?? "all"],
    staleTime: 30_000,
    queryFn: async (): Promise<SyncSession[]> => {
      let q = (supabase as any)
        .from("music_sync_sessions")
        .select("*")
        .gte("scheduled_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SyncSession[];
    },
  });
}

export function useSyncSession(id?: string) {
  return useQuery({
    queryKey: ["music-sync-session", id],
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async (): Promise<SyncSession | null> => {
      const { data, error } = await (supabase as any)
        .from("music_sync_sessions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SyncSession | null;
    },
  });
}

export function useMyRsvp(sessionId?: string) {
  return useQuery({
    queryKey: ["music-sync-my-rsvp", sessionId],
    enabled: !!sessionId,
    staleTime: 15_000,
    queryFn: async (): Promise<RsvpStatus | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await (supabase as any)
        .from("music_sync_attendees")
        .select("rsvp")
        .eq("session_id", sessionId)
        .eq("fan_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.rsvp ?? null) as RsvpStatus | null;
    },
  });
}

export function useCreateSyncSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      scheduled_at: string;
      artist_id?: string | null;
      cover_url?: string | null;
      spotify_url?: string | null;
      album_name?: string | null;
      duration_minutes?: number;
      capacity?: number;
      host_message?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_sync_sessions")
        .insert({
          host_id: u.user.id,
          title: input.title,
          scheduled_at: input.scheduled_at,
          artist_id: input.artist_id ?? null,
          cover_url: input.cover_url ?? null,
          spotify_url: input.spotify_url ?? null,
          album_name: input.album_name ?? null,
          duration_minutes: input.duration_minutes ?? 60,
          capacity: input.capacity ?? 50,
          host_message: input.host_message ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as SyncSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-sync-sessions"] });
    },
  });
}

export function useSetRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session_id: string; rsvp: RsvpStatus }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await (supabase as any)
        .from("music_sync_attendees")
        .upsert(
          { session_id: input.session_id, fan_id: u.user.id, rsvp: input.rsvp },
          { onConflict: "session_id,fan_id" },
        );
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-sync-my-rsvp", input.session_id] });
      qc.invalidateQueries({ queryKey: ["music-sync-session", input.session_id] });
      qc.invalidateQueries({ queryKey: ["music-sync-sessions"] });
    },
  });
}
