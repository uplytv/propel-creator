import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export interface AudioPreferences {
  user_id: string;
  spatial_enabled: boolean;
  lossless_enabled: boolean;
  prefer_on_wifi_only: boolean;
  normalize_volume: boolean;
}

const DEFAULTS: Omit<AudioPreferences, 'user_id'> = {
  spatial_enabled: true,
  lossless_enabled: false,
  prefer_on_wifi_only: true,
  normalize_volume: true,
};

export function useAudioPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'audio-prefs', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AudioPreferences> => {
      const { data } = await sb
        .from('music_audio_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return (data as AudioPreferences) ?? { user_id: user!.id, ...DEFAULTS };
    },
  });
}

export function useUpdateAudioPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<AudioPreferences, 'user_id'>>) => {
      if (!user) throw new Error('not authed');
      const { error } = await sb
        .from('music_audio_preferences')
        .upsert({ user_id: user.id, ...DEFAULTS, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'audio-prefs', user?.id] }),
  });
}

/** Pick the best available stream URL given prefs + connection. */
export function pickStreamUrl(
  track: { audio_url?: string | null; hires_url?: string | null; spatial_url?: string | null; has_spatial?: boolean; has_lossless?: boolean },
  prefs: Pick<AudioPreferences, 'spatial_enabled' | 'lossless_enabled' | 'prefer_on_wifi_only'>,
): { url: string | null; tier: 'spatial' | 'lossless' | 'standard' } {
  const conn = (navigator as any).connection;
  const onWifi = !conn || conn.type === 'wifi' || !conn.type;
  const allowHigh = prefs.prefer_on_wifi_only ? onWifi : true;

  if (allowHigh && prefs.spatial_enabled && track.has_spatial && track.spatial_url) {
    return { url: track.spatial_url, tier: 'spatial' };
  }
  if (allowHigh && prefs.lossless_enabled && track.has_lossless && track.hires_url) {
    return { url: track.hires_url, tier: 'lossless' };
  }
  return { url: track.audio_url ?? null, tier: 'standard' };
}
