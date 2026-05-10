import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export interface MusicNotificationPrefs {
  user_id: string;
  new_release: boolean;
  drop_reminders: boolean;
  artist_messages: boolean;
  concert_reminders: boolean;
  weekly_digest: boolean;
}

const DEFAULTS: Omit<MusicNotificationPrefs, 'user_id'> = {
  new_release: true,
  drop_reminders: true,
  artist_messages: true,
  concert_reminders: true,
  weekly_digest: false,
};

export function useMusicNotificationPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'notif-prefs', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MusicNotificationPrefs> => {
      const { data } = await sb
        .from('music_notification_prefs')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return (data as MusicNotificationPrefs) ?? { user_id: user!.id, ...DEFAULTS };
    },
  });
}

export function useUpdateMusicNotificationPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<MusicNotificationPrefs, 'user_id'>>) => {
      if (!user) throw new Error('not authed');
      const { error } = await sb
        .from('music_notification_prefs')
        .upsert({ user_id: user.id, ...DEFAULTS, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'notif-prefs', user?.id] }),
  });
}
