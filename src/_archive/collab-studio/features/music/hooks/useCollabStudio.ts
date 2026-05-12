import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CollabProject {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  bpm: number;
  music_key: string | null;
  is_public: boolean;
  cover_url: string | null;
  created_at: string;
}

export interface CollabTrack {
  id: string;
  project_id: string;
  name: string;
  audio_url: string | null;
  volume: number;
  pan: number;
  is_muted: boolean;
  position: number;
  locked_by: string | null;
  created_by: string | null;
}

export interface CollabEvent {
  id: string;
  project_id: string;
  user_id: string;
  event_type: string;
  payload: any;
  created_at: string;
}

export function useMyCollabProjects() {
  return useQuery({
    queryKey: ["my-collab-projects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("music_collab_projects")
        .select("*")
        .or(`owner_id.eq.${user.id},id.in.(${await myMemberProjectIds(user.id)})`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CollabProject[];
    },
  });
}

async function myMemberProjectIds(userId: string): Promise<string> {
  const { data } = await supabase
    .from("music_collab_members")
    .select("project_id")
    .eq("user_id", userId);
  const ids = (data ?? []).map((r: any) => r.project_id);
  return ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000";
}

export function useCollabProject(id: string | undefined) {
  return useQuery({
    queryKey: ["collab-project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_collab_projects")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CollabProject | null;
    },
  });
}

export function useCreateCollabProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; bpm?: number; music_key?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("music_collab_projects")
        .insert({
          owner_id: user.id,
          title: input.title,
          bpm: input.bpm ?? 120,
          music_key: input.music_key ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CollabProject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-collab-projects"] }),
  });
}

export function useCollabTracks(projectId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["collab-tracks", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_collab_tracks")
        .select("*")
        .eq("project_id", projectId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CollabTrack[];
    },
  });

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`collab-tracks-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_collab_tracks", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["collab-tracks", projectId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);

  return query;
}

export function useUpdateTrack() {
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<CollabTrack> }) => {
      const { error } = await supabase
        .from("music_collab_tracks")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
    },
  });
}

export function useAddTrack() {
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; audio_url?: string; position: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("music_collab_tracks").insert({
        project_id: input.project_id,
        name: input.name,
        audio_url: input.audio_url ?? null,
        position: input.position,
        created_by: user.id,
      });
      if (error) throw error;
    },
  });
}

export function useDeleteTrack() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("music_collab_tracks").delete().eq("id", id);
      if (error) throw error;
    },
  });
}

export function useCollabEvents(projectId: string | undefined) {
  const [events, setEvents] = useState<CollabEvent[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("music_collab_events")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (active) setEvents((data ?? []) as CollabEvent[]);
    })();
    const ch = supabase
      .channel(`collab-events-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "music_collab_events", filter: `project_id=eq.${projectId}` },
        (payload) => setEvents((prev) => [payload.new as CollabEvent, ...prev].slice(0, 50)),
      )
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [projectId]);

  return events;
}

export function useLogCollabEvent() {
  return useMutation({
    mutationFn: async (input: { project_id: string; event_type: string; payload?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("music_collab_events").insert({
        project_id: input.project_id,
        user_id: user.id,
        event_type: input.event_type,
        payload: input.payload ?? {},
      });
    },
  });
}
