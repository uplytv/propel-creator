import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export function useRepostStatus(trackId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['music', 'repost', trackId, user?.id],
    enabled: !!user && !!trackId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('track_reposts')
        .select('id')
        .eq('user_id', user!.id)
        .eq('track_id', trackId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useToggleRepost(trackId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caption?: string) => {
      if (!user) throw new Error('Sign in to repost');
      const { data: existing } = await sb
        .from('track_reposts')
        .select('id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();
      if (existing) {
        const { error } = await sb.from('track_reposts').delete().eq('id', existing.id);
        if (error) throw error;
        return false;
      }
      const { error } = await sb
        .from('track_reposts')
        .insert({ user_id: user.id, track_id: trackId, caption: caption ?? null });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'repost', trackId, user?.id] });
    },
  });
}
