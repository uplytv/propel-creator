import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VideoChapter {
  id: string;
  video_id: string;
  title: string;
  start_seconds: number;
  position: number;
  created_at: string;
}

export function useVideoChapters(videoId?: string) {
  return useQuery({
    queryKey: ["video-chapters", videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const { data, error } = await supabase
        .from("video_chapters")
        .select("*")
        .eq("video_id", videoId)
        .order("start_seconds", { ascending: true });
      if (error) throw error;
      return (data || []) as VideoChapter[];
    },
    enabled: !!videoId,
  });
}

export function useUpsertChapter(videoId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chapter: { id?: string; title: string; start_seconds: number; position: number }) => {
      if (!videoId) throw new Error("videoId required");
      const payload = { ...chapter, video_id: videoId };
      const { data, error } = await supabase
        .from("video_chapters")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as VideoChapter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-chapters", videoId] }),
  });
}

export function useDeleteChapter(videoId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("video_chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-chapters", videoId] }),
  });
}
