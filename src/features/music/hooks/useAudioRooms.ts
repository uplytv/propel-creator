import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as any;

export interface AudioRoom {
  id: string;
  host_id: string;
  title: string;
  topic: string | null;
  is_live: boolean;
  started_at: string;
  ended_at: string | null;
  listeners_count: number;
}

export interface AudioRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: "host" | "speaker" | "listener";
  joined_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

export function useLiveAudioRooms() {
  return useQuery<AudioRoom[]>({
    queryKey: ["audio-rooms-live"],
    queryFn: async () => {
      const { data } = await sb
        .from("music_audio_rooms")
        .select("*")
        .eq("is_live", true)
        .order("listeners_count", { ascending: false })
        .limit(30);
      return (data as AudioRoom[]) ?? [];
    },
  });
}

export function useAudioRoom(id?: string) {
  const qc = useQueryClient();
  const query = useQuery<AudioRoom | null>({
    queryKey: ["audio-room", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("music_audio_rooms").select("*").eq("id", id).maybeSingle();
      return (data as AudioRoom) ?? null;
    },
  });

  useEffect(() => {
    if (!id) return;
    const ch = sb
      .channel(`audio-room-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_audio_rooms", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["audio-room", id] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_audio_room_participants", filter: `room_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["audio-room-participants", id] })
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [id, qc]);

  return query;
}

export function useAudioRoomParticipants(roomId?: string) {
  return useQuery<AudioRoomParticipant[]>({
    queryKey: ["audio-room-participants", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data: rows } = await sb
        .from("music_audio_room_participants")
        .select("*")
        .eq("room_id", roomId);
      const list = (rows as AudioRoomParticipant[]) ?? [];
      const userIds = list.map((m) => m.user_id);
      if (!userIds.length) return list;
      const { data: profiles } = await sb
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .in("id", userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return list.map((m) => ({ ...m, profile: map.get(m.user_id) as any }));
    },
  });
}

export function useStartAudioRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; topic?: string }) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await sb
        .from("music_audio_rooms")
        .insert({ ...input, host_id: user.id, is_live: true })
        .select()
        .single();
      if (error) throw error;
      await sb.from("music_audio_room_participants").insert({
        room_id: data.id,
        user_id: user.id,
        role: "host",
      });
      return data as AudioRoom;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audio-rooms-live"] }),
  });
}

export function useJoinAudioRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user) throw new Error("Sign in required");
      await sb
        .from("music_audio_room_participants")
        .upsert({ room_id: roomId, user_id: user.id, role: "listener" }, { onConflict: "room_id,user_id" });
    },
    onSuccess: (_, roomId) => qc.invalidateQueries({ queryKey: ["audio-room-participants", roomId] }),
  });
}

export function useLeaveAudioRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user) return;
      await sb
        .from("music_audio_room_participants")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user.id);
    },
    onSuccess: (_, roomId) => qc.invalidateQueries({ queryKey: ["audio-room-participants", roomId] }),
  });
}

export function useEndAudioRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      await sb
        .from("music_audio_rooms")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", roomId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audio-rooms-live"] });
    },
  });
}
