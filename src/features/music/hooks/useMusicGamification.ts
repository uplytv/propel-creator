import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMyStreak() {
  return useQuery({
    queryKey: ['music', 'streak', 'me'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) return null;
      const { data, error } = await supabase
        .from('music_listen_streaks')
        .select('*')
        .eq('user_id', u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRecordListenDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('record_music_listen_day');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'streak', 'me'] });
      qc.invalidateQueries({ queryKey: ['music', 'badges', 'me'] });
    },
  });
}

export function useStreakLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ['music', 'streak', 'leaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('music_streak_leaderboard', {
        p_limit: limit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBadgeCatalog() {
  return useQuery({
    queryKey: ['music', 'badges', 'catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('music_badges')
        .select('*')
        .order('tier', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyBadges() {
  return useQuery({
    queryKey: ['music', 'badges', 'me'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) return [];
      const { data, error } = await supabase
        .from('music_user_badges')
        .select('badge_key, unlocked_at, music_badges(*)')
        .eq('user_id', u.user.id)
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUserBadges(userId?: string) {
  return useQuery({
    queryKey: ['music', 'badges', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('music_user_badges')
        .select('badge_key, unlocked_at, music_badges(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
