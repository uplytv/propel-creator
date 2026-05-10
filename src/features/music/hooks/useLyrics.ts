import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SyncedLine = { time: number; text: string };

export function useTrackLyrics(trackId?: string, language = "en") {
  return useQuery({
    queryKey: ["music-lyrics", trackId, language],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyrics")
        .select("*")
        .eq("track_id", trackId!)
        .eq("language", language)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLyricTranslations(lyricId?: string) {
  return useQuery({
    queryKey: ["music-lyric-translations", lyricId],
    enabled: !!lyricId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_lyric_translations")
        .select("*")
        .eq("lyric_id", lyricId!)
        .order("language");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveKaraokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      track_id: string;
      lyric_id?: string;
      score: number;
      accuracy: number;
      duration_seconds: number;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_karaoke_sessions")
        .insert({ ...input, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-karaoke-sessions"] }),
  });
}

export function useMyKaraokeSessions() {
  return useQuery({
    queryKey: ["my-karaoke-sessions"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_karaoke_sessions")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
