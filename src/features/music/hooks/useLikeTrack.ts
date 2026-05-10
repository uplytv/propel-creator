import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export function useLikeTrack(trackId: string | undefined) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user || !trackId) {
        setLiked(false);
        return;
      }
      const { data } = await sb
        .from('track_likes')
        .select('track_id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();
      if (!cancelled) setLiked(!!data);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, trackId]);

  const toggle = useCallback(async () => {
    if (!user || !trackId || loading) return;
    setLoading(true);
    if (liked) {
      await sb.from('track_likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      setLiked(false);
    } else {
      await sb.from('track_likes').insert({ user_id: user.id, track_id: trackId });
      setLiked(true);
    }
    setLoading(false);
  }, [user, trackId, liked, loading]);

  return { liked, toggle, loading };
}
