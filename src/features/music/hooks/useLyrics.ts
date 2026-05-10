import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export interface Lyrics {
  track_id: string;
  lyrics_text: string | null;
  lrc_text: string | null;
  language: string | null;
}

export interface LrcLine {
  time: number; // seconds
  text: string;
}

export function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lrc))) {
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
    lines.push({ time: min * 60 + sec + ms / 1000, text: m[4].trim() });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function useLyrics(trackId: string | undefined) {
  return useQuery({
    queryKey: ['music', 'lyrics', trackId],
    enabled: !!trackId,
    queryFn: async (): Promise<Lyrics | null> => {
      const { data, error } = await sb
        .from('track_lyrics')
        .select('*')
        .eq('track_id', trackId!)
        .maybeSingle();
      if (error) throw error;
      return data as Lyrics | null;
    },
  });
}

export function useSaveLyrics(trackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lyrics_text?: string | null; lrc_text?: string | null }) => {
      const { error } = await sb.from('track_lyrics').upsert({
        track_id: trackId,
        lyrics_text: input.lyrics_text ?? null,
        lrc_text: input.lrc_text ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'lyrics', trackId] }),
  });
}
