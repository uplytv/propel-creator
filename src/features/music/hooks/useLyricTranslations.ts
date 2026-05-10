import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as unknown as any;

export interface LyricTranslation {
  id: string;
  track_id: string;
  language: string;
  lrc_text: string | null;
  lyrics_text: string | null;
}

export function useLyricTranslations(trackId: string | undefined) {
  return useQuery({
    queryKey: ['music', 'lyric-translations', trackId],
    enabled: !!trackId,
    queryFn: async (): Promise<LyricTranslation[]> => {
      const { data, error } = await sb
        .from('track_lyric_translations')
        .select('*')
        .eq('track_id', trackId!)
        .order('language');
      if (error) throw error;
      return (data ?? []) as LyricTranslation[];
    },
  });
}

export function useSaveLyricTranslation(trackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { language: string; lrc_text?: string | null; lyrics_text?: string | null }) => {
      const { error } = await sb.from('track_lyric_translations').upsert({
        track_id: trackId,
        language: input.language,
        lrc_text: input.lrc_text ?? null,
        lyrics_text: input.lyrics_text ?? null,
      }, { onConflict: 'track_id,language' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'lyric-translations', trackId] }),
  });
}
