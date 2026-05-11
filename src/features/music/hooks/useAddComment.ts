import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const sb = supabase as unknown as any;

export function useAddComment(trackId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      timestampSeconds,
      parentId,
    }: {
      content: string;
      timestampSeconds: number | null;
      parentId?: string | null;
    }) => {
      if (!user) throw new Error('Sign in to comment');
      const { error } = await sb.from('track_comments').insert({
        track_id: trackId,
        user_id: user.id,
        content,
        timestamp_seconds: timestampSeconds,
        parent_id: parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'track-comments', trackId] });
    },
  });
}

export function useDeleteComment(trackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await sb.from('track_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music', 'track-comments', trackId] });
    },
  });
}

export function useToggleCommentLike(trackId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('Sign in to like');
      const { data: existing } = await sb
        .from('track_comment_likes')
        .select('comment_id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        await sb.from('track_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      } else {
        await sb.from('track_comment_likes').insert({ comment_id: commentId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music', 'track-comments', trackId] }),
  });
}
