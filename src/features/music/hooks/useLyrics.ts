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

// Backward-compat: parse LRC text into synced lines
export function parseLrc(lrc: string): SyncedLine[] {
  if (!lrc) return [];
  const out: SyncedLine[] = [];
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
  for (const raw of lrc.split(/\r?\n/)) {
    const m = raw.match(re);
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
    out.push({ time: min * 60 + sec + ms / 1000, text: (m[4] ?? "").trim() });
  }
  return out.sort((a, b) => a.time - b.time);
}

// Backward-compat alias used by older components; returns lyric with `lrc_text` shape
export function useLyrics(trackId?: string, language = "en") {
  const q = useTrackLyrics(trackId, language);
  const data = q.data
    ? {
        ...q.data,
        lrc_text:
          (q.data as any).plain_text ??
          (Array.isArray((q.data as any).synced_lines)
            ? ((q.data as any).synced_lines as SyncedLine[])
                .map((l) => {
                  const m = Math.floor(l.time / 60);
                  const s = (l.time - m * 60).toFixed(2).padStart(5, "0");
                  return `[${String(m).padStart(2, "0")}:${s}]${l.text}`;
                })
                .join("\n")
            : ""),
      }
    : q.data;
  return { ...q, data } as typeof q;
}
