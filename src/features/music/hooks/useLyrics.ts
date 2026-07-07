import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface SyncedLine {
  time: number; // start time in seconds
  text: string;
}

export interface Lyrics {
  id: string;
  track_id: string;
  contributor_id: string | null;
  language: string;
  plain_text: string | null;
  lrc_text?: string | null;
  /** Legacy alias for plain_text. */
  lyrics_text?: string | null;
  synced_lines: SyncedLine[] | null;
  is_karaoke_ready: boolean;
  is_published: boolean;
}

export function useTrackLyrics(trackId?: string, language?: string) {
  return useQuery({
    queryKey: ["lyrics", trackId, language ?? "any"],
    queryFn: async () => {
      if (!trackId) return null;
      let q = supabase
        .from("music_lyrics")
        .select("*")
        .eq("track_id", trackId)
        .eq("is_published", true);
      if (language) q = q.eq("language", language);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (!data.lrc_text && Array.isArray(data.synced_lines)) {
        data.lrc_text = (data.synced_lines as SyncedLine[])
          .map((l: SyncedLine) => `[${formatTimeLrc(l.time ?? 0)}]${l.text}`)
          .join("\n");
      }
      data.lyrics_text = data.plain_text;
      return data as Lyrics;
    },
    enabled: !!trackId,
  });
}

// Legacy alias used by existing components.
export const useLyrics = useTrackLyrics;

// Legacy stub: returns empty translation list (translations not yet stored separately).
export function useLyricTranslations(_id?: string) {
  return useQuery({
    queryKey: ["lyric-translations", _id],
    queryFn: async () =>
      [] as Array<{
        id: string;
        language: string;
        lrc_text: string;
        translated_synced_lines?: SyncedLine[];
      }>,
    enabled: !!_id,
  });
}

// Legacy stub: no-op save for karaoke session telemetry.
export function useSaveKaraokeSession() {
  return useMutation({
    mutationFn: async (_payload: Record<string, unknown>) => {
      return { ok: true };
    },
  });
}

export function useUpsertLyrics() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      track_id: string;
      language?: string;
      plain_text?: string;
      synced_lines?: SyncedLine[];
      is_karaoke_ready?: boolean;
      is_published?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_lyrics")
        .upsert(
          {
            ...payload,
            contributor_id: user.id,
            is_karaoke_ready:
              payload.is_karaoke_ready ?? (payload.synced_lines?.length ?? 0) > 0,
          },
          { onConflict: "track_id,language" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as Lyrics;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["lyrics", vars.track_id] }),
  });
}

/** Parse LRC format: [mm:ss.xx]text */
export function parseLRC(input: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
  for (const raw of input.split(/\r?\n/)) {
    const m = raw.match(re);
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = m[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

// Legacy alias for existing callers.
export const parseLrc = parseLRC;

function formatTimeLrc(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}
