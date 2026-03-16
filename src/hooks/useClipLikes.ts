import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ClipLike {
  clip_id: string;
  liked: boolean;
  count: number;
}

export function useClipLikes() {
  const { user } = useAuth();
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const fetchLikeStatus = useCallback(async (clipIds: string[]) => {
    if (!clipIds.length) return;

    // Fetch counts
    for (const clipId of clipIds) {
      const { count } = await supabase
        .from('clip_likes')
        .select('*', { count: 'exact', head: true })
        .eq('clip_id', clipId);
      setLikeCounts(prev => ({ ...prev, [clipId]: count || 0 }));
    }

    // Fetch user's likes
    if (user) {
      const { data } = await supabase
        .from('clip_likes')
        .select('clip_id')
        .eq('user_id', user.id)
        .in('clip_id', clipIds);
      if (data) {
        setLikedClips(new Set(data.map((l: any) => l.clip_id)));
      }
    }
  }, [user]);

  const toggleLike = useCallback(async (clipId: string) => {
    if (!user) return;

    const isLiked = likedClips.has(clipId);

    if (isLiked) {
      setLikedClips(prev => { const next = new Set(prev); next.delete(clipId); return next; });
      setLikeCounts(prev => ({ ...prev, [clipId]: Math.max(0, (prev[clipId] || 0) - 1) }));
      await supabase.from('clip_likes').delete().eq('clip_id', clipId).eq('user_id', user.id);
    } else {
      setLikedClips(prev => { const next = new Set(prev); next.add(clipId); return next; });
      setLikeCounts(prev => ({ ...prev, [clipId]: (prev[clipId] || 0) + 1 }));
      await supabase.from('clip_likes').insert({ clip_id: clipId, user_id: user.id });
    }
  }, [user, likedClips]);

  return {
    likedClips,
    likeCounts,
    fetchLikeStatus,
    toggleLike,
    isLiked: (clipId: string) => likedClips.has(clipId),
    getLikeCount: (clipId: string) => likeCounts[clipId] || 0,
  };
}
