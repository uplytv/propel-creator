import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LinerNoteStoryType = "story" | "credits" | "recording" | "inspiration" | "lyric_meaning";

export interface LinerNote {
  id: string;
  artist_id: string;
  track_title: string;
  album: string | null;
  body: string;
  story_type: LinerNoteStoryType;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export function useLinerNotes(artistId?: string) {
  return useQuery({
    queryKey: ["music_liner_notes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("music_liner_notes")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LinerNote[];
    },
  });
}

export function useLinerNote(id?: string) {
  return useQuery({
    queryKey: ["music_liner_note", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("music_liner_notes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as LinerNote | null;
    },
  });
}

export function useMyLinerNoteReaction(noteId?: string) {
  return useQuery({
    queryKey: ["music_liner_note_reaction", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const { data, error } = await (supabase as any)
        .from("music_liner_note_reactions")
        .select("id")
        .eq("note_id", noteId)
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useCreateLinerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      track_title: string;
      album?: string | null;
      body: string;
      story_type?: LinerNoteStoryType;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_liner_notes")
        .insert({ ...input, artist_id: uid, story_type: input.story_type ?? "story" })
        .select("*")
        .single();
      if (error) throw error;
      return data as LinerNote;
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["music_liner_notes", note.artist_id] });
    },
  });
}

export function useToggleLinerNoteReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, liked }: { noteId: string; liked: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      if (liked) {
        const { error } = await (supabase as any)
          .from("music_liner_note_reactions")
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_liner_note_reactions")
          .insert({ note_id: noteId, user_id: uid });
        if (error) throw error;
      }
      return !liked;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_liner_note_reaction", vars.noteId] });
      qc.invalidateQueries({ queryKey: ["music_liner_notes"] });
      qc.invalidateQueries({ queryKey: ["music_liner_note", vars.noteId] });
    },
  });
}
