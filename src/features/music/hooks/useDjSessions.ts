import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePublicDjSessions(limit = 30) {
  return useQuery({
    queryKey: ['music', 'dj-sessions', 'public', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_sessions')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyDjSessions() {
  return useQuery({
    queryKey: ['music', 'dj-sessions', 'mine'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) return [];
      const { data, error } = await supabase
        .from('dj_sessions')
        .select('*')
        .eq('user_id', u.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveDjSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      cover_url?: string;
      recording_url?: string;
      duration_seconds: number;
      target_bpm?: number;
      is_public?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('dj_sessions')
        .insert({ user_id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'dj-sessions', 'mine'] });
      qc.invalidateQueries({ queryKey: ['music', 'dj-sessions', 'public'] });
    },
  });
}

export function useAddCue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      at_seconds: number;
      deck: 'A' | 'B' | 'MIX';
      label?: string;
      track_url?: string;
      track_title?: string;
      bpm?: number;
    }) => {
      const { data, error } = await supabase
        .from('dj_session_cues')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['music', 'dj-cues', vars.session_id] }),
  });
}

export function useDjCues(sessionId?: string) {
  return useQuery({
    queryKey: ['music', 'dj-cues', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('dj_session_cues')
        .select('*')
        .eq('session_id', sessionId)
        .order('at_seconds', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sessionId,
  });
}
