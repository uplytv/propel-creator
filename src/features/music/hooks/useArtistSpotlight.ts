import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;
const MAX_SPOTLIGHT = 5;

export function useUpdateSpotlight() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackIds: string[]) => {
      if (!user) throw new Error('Sign in');
      const ids = trackIds.slice(0, MAX_SPOTLIGHT);
      const { error } = await sb
        .from('artist_profiles')
        .upsert({ user_id: user.id, spotlight_track_ids: ids }, { onConflict: 'user_id' });
      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['artist-profile', user?.id] });
    },
  });
}

export const SPOTLIGHT_LIMIT = MAX_SPOTLIGHT;
