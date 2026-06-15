import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useFollows() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowing = useCallback(async () => {
    if (!user) {
      setFollowingIds([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    setFollowingIds((data || []).map((f: any) => f.following_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const follow = useCallback(async (targetUserId: string) => {
    if (!user) return;
    // Optimistic: update the UI instantly, reconcile with the server on failure.
    setFollowingIds(prev => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
    if (error) fetchFollowing();
  }, [user, fetchFollowing]);

  const unfollow = useCallback(async (targetUserId: string) => {
    if (!user) return;
    setFollowingIds(prev => prev.filter(id => id !== targetUserId));
    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    if (error) fetchFollowing();
  }, [user, fetchFollowing]);

  const isFollowing = useCallback((targetUserId: string) => {
    return followingIds.includes(targetUserId);
  }, [followingIds]);

  return { followingIds, loading, follow, unfollow, isFollowing, refetch: fetchFollowing };
}
