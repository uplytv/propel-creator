import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LyricSheetStatus = "draft" | "published";

export interface LyricSheet {
  id: string;
  artist_id: string;
  track_title: string;
  artist_label: string | null;
  lyrics_text: string | null;
  status: LyricSheetStatus;
  annotation_count: number;
  created_at: string;
  updated_at: string;
}

export interface LyricLine {
  id: string;
  sheet_id: string;
  line_number: number;
  line_text: string;
  annotation_count: number;
}

export interface LyricAnnotation {
  id: string;
  line_id: string;
  sheet_id: string;
  author_id: string;
  body: string;
  upvote_count: number;
  status: "visible" | "hidden";
  created_at: string;
}

export function useLyricSheets(artistId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["music_lyric_sheets", artistId, opts?.includeDrafts ?? false],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("music_lyric_sheets" as any)
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (!opts?.includeDrafts) q = q.eq("status", "published");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LyricSheet[];
    },
  });
}

export function useLyricSheet(id?: string) {
  return useQuery({
    queryKey: ["music_lyric_sheet", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyric_sheets" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LyricSheet | null;
    },
  });
}

export function useLyricLines(sheetId?: string) {
  return useQuery({
    queryKey: ["music_lyric_lines", sheetId],
    enabled: !!sheetId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyric_lines" as any)
        .select("*")
        .eq("sheet_id", sheetId!)
        .order("line_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LyricLine[];
    },
  });
}

export function useLineAnnotations(lineId?: string) {
  return useQuery({
    queryKey: ["music_lyric_annotations", lineId],
    enabled: !!lineId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyric_annotations" as any)
        .select("*")
        .eq("line_id", lineId!)
        .eq("status", "visible")
        .order("upvote_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LyricAnnotation[];
    },
  });
}

export function useCreateLyricSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { track_title: string; artist_label?: string; lyrics_text?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_lyric_sheets" as any)
        .insert({ ...input, artist_id: u.user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LyricSheet;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["music_lyric_sheets", d.artist_id] });
    },
  });
}

export function useAddLyricLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sheetId: string; line_number: number; line_text: string }) => {
      const { error } = await supabase
        .from("music_lyric_lines" as any)
        .insert({ sheet_id: input.sheetId, line_number: input.line_number, line_text: input.line_text } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_lyric_lines", vars.sheetId] });
    },
  });
}

export function useAddLyricAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lineId: string; sheetId: string; body: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_lyric_annotations" as any)
        .insert({
          line_id: input.lineId,
          sheet_id: input.sheetId,
          author_id: u.user.id,
          body: input.body,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_lyric_annotations", vars.lineId] });
      qc.invalidateQueries({ queryKey: ["music_lyric_lines", vars.sheetId] });
      qc.invalidateQueries({ queryKey: ["music_lyric_sheet", vars.sheetId] });
    },
  });
}

export function useVoteLyricAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ annotationId }: { annotationId: string; lineId: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_lyric_annotation_votes" as any)
        .insert({ annotation_id: annotationId, voter_id: u.user.id } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_lyric_annotations", vars.lineId] });
    },
  });
}

export function useUnvoteLyricAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ annotationId }: { annotationId: string; lineId: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("music_lyric_annotation_votes" as any)
        .delete()
        .eq("annotation_id", annotationId)
        .eq("voter_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_lyric_annotations", vars.lineId] });
    },
  });
}
