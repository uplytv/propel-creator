import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { tables } from "@/lib/supabaseTyped";

export interface Video {
  id: string;
  creator_id: string;
  mux_asset_id: string | null;
  playback_id: string | null;
  download_url: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_public: boolean;
  is_featured: boolean;
  trending_score: number;
  slug: string | null;
  visibility: string | null;
  scheduled_publish_at: string | null;
  created_at: string;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  like_count: number;
  reply_count: number;
  is_liked_by_user?: boolean;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

export type CommentSort = "top" | "newest";

export function useVideos(creatorId?: string) {
  return useQuery({
    queryKey: ["videos", creatorId],
    queryFn: async () => {
      let q = tables.videos().select("*").order("created_at", { ascending: false });
      if (creatorId) q = q.eq("creator_id", creatorId);
      else q = q.eq("is_public", true);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return (data || []) as Video[];
    },
  });
}

export function useVideo(slugOrId: string | undefined) {
  return useQuery({
    queryKey: ["video", slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null;
      const { data: bySlug } = await tables.videos()
        .select("*")
        .eq("slug", slugOrId)
        .maybeSingle();
      if (bySlug) return bySlug as Video;
      const { data: byId } = await tables.videos()
        .select("*")
        .eq("id", slugOrId)
        .maybeSingle();
      return (byId as Video) || null;
    },
    enabled: !!slugOrId,
  });
}

/**
 * Top-level comments (parent_id IS NULL) for a video.
 * Includes whether the current user has liked each comment.
 * Subscribes to realtime inserts so new comments appear without refetching.
 */
export function useVideoComments(videoId: string | undefined, sort: CommentSort = "top") {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["video-comments", videoId, sort, user?.id],
    queryFn: async () => {
      if (!videoId) return [] as VideoComment[];
      let q = tables.videoComments()
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("video_id", videoId)
        .is("parent_id", null);
      if (sort === "top") {
        q = q.order("like_count", { ascending: false }).order("created_at", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }
      const { data, error } = await q.limit(100);
      if (error) throw error;
      const comments = (data || []) as VideoComment[];

      // Hydrate is_liked_by_user
      if (user && comments.length > 0) {
        const ids = comments.map(c => c.id);
        const { data: likes } = await tables.videoCommentLikes()
          .select("comment_id")
          .eq("user_id", user.id)
          .in("comment_id", ids);
        const likedSet = new Set((likes || []).map((l: any) => l.comment_id));
        comments.forEach(c => { c.is_liked_by_user = likedSet.has(c.id); });
      }
      return comments;
    },
    enabled: !!videoId,
  });

  // Realtime: append new top-level comments instantly
  useEffect(() => {
    if (!videoId) return;
    const channel = supabase
      .channel(`video-comments-${videoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "video_comments", filter: `video_id=eq.${videoId}` },
        async (payload) => {
          const row: any = payload.new;
          if (row.parent_id) {
            // Reply — invalidate that parent's reply list
            qc.invalidateQueries({ queryKey: ["video-comment-replies", row.parent_id] });
            return;
          }
          // Fetch profile for the new comment
          const { data: profile } = await tables.profiles()
            .select("display_name, avatar_url")
            .eq("user_id", row.user_id)
            .maybeSingle();
          const newComment: VideoComment = {
            ...row,
            profiles: profile,
            is_liked_by_user: false,
            reply_count: row.reply_count ?? 0,
            like_count: row.like_count ?? 0,
          };
          qc.setQueriesData({ queryKey: ["video-comments", videoId] }, (old: VideoComment[] | undefined) => {
            if (!old) return [newComment];
            if (old.find(c => c.id === newComment.id)) return old;
            return [newComment, ...old];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [videoId, qc]);

  return query;
}

/**
 * Lazy-loaded replies for a single parent comment.
 */
export function useCommentReplies(parentId: string | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["video-comment-replies", parentId, user?.id],
    enabled: !!parentId && enabled,
    queryFn: async () => {
      const { data, error } = await tables.videoComments()
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      const replies = (data || []) as VideoComment[];
      if (user && replies.length > 0) {
        const ids = replies.map(r => r.id);
        const { data: likes } = await tables.videoCommentLikes()
          .select("comment_id")
          .eq("user_id", user.id)
          .in("comment_id", ids);
        const likedSet = new Set((likes || []).map((l: any) => l.comment_id));
        replies.forEach(r => { r.is_liked_by_user = likedSet.has(r.id); });
      }
      return replies;
    },
  });
}

export function useVideoLike(videoId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const likeQuery = useQuery({
    queryKey: ["video-like", videoId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await tables.videoLikes()
        .select("id")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!videoId && !!user,
  });

  const toggleLike = async () => {
    if (!user || !videoId) return;
    if (likeQuery.data) {
      await tables.videoLikes().delete().eq("video_id", videoId).eq("user_id", user.id);
    } else {
      await tables.videoLikes().insert({ video_id: videoId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["video-like", videoId] });
    qc.invalidateQueries({ queryKey: ["video"] });
  };

  return { isLiked: likeQuery.data || false, toggleLike };
}

/**
 * Optimistic toggle for liking/unliking a comment.
 * Updates both top-level comments and replies caches.
 */
export function useToggleCommentLike(videoId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!user) throw new Error("Sign in to like comments");
      if (liked) {
        const { error } = await tables.videoCommentLikes()
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await tables.videoCommentLikes()
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ commentId, liked }) => {
      // Optimistic update across all matching caches
      const apply = (list: VideoComment[] | undefined) =>
        list?.map(c =>
          c.id === commentId
            ? { ...c, is_liked_by_user: !liked, like_count: Math.max(0, c.like_count + (liked ? -1 : 1)) }
            : c
        );
      qc.setQueriesData({ queryKey: ["video-comments", videoId] }, apply);
      qc.setQueriesData({ queryKey: ["video-comment-replies"] }, apply);
    },
    onError: (err: Error, { commentId, liked }) => {
      // Rollback
      const rollback = (list: VideoComment[] | undefined) =>
        list?.map(c =>
          c.id === commentId
            ? { ...c, is_liked_by_user: liked, like_count: Math.max(0, c.like_count + (liked ? 1 : -1)) }
            : c
        );
      qc.setQueriesData({ queryKey: ["video-comments", videoId] }, rollback);
      qc.setQueriesData({ queryKey: ["video-comment-replies"] }, rollback);
      toast.error(err.message || "Couldn't update like");
    },
  });
}

export function useAddComment(videoId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string | null }) => {
      if (!user || !videoId) throw new Error("Not authenticated");
      const { data, error } = await tables.videoComments()
        .insert({ video_id: videoId, user_id: user.id, body, parent_id: parentId ?? null })
        .select("*, profiles:user_id(display_name, avatar_url)")
        .single();
      if (error) throw error;
      return data as VideoComment;
    },
    onSuccess: (newComment, vars) => {
      // Optimistic cache update (realtime will dedupe)
      if (vars.parentId) {
        qc.setQueriesData({ queryKey: ["video-comment-replies", vars.parentId] }, (old: VideoComment[] | undefined) => {
          if (!old) return [newComment];
          if (old.find(c => c.id === newComment.id)) return old;
          return [...old, { ...newComment, is_liked_by_user: false }];
        });
        // Bump parent's reply_count optimistically
        const bumpParent = (list: VideoComment[] | undefined) =>
          list?.map(c => c.id === vars.parentId ? { ...c, reply_count: (c.reply_count ?? 0) + 1 } : c);
        qc.setQueriesData({ queryKey: ["video-comments", videoId] }, bumpParent);
      } else {
        qc.setQueriesData({ queryKey: ["video-comments", videoId] }, (old: VideoComment[] | undefined) => {
          if (!old) return [newComment];
          if (old.find(c => c.id === newComment.id)) return old;
          return [{ ...newComment, is_liked_by_user: false }, ...old];
        });
        // Bump video.comment_count
        qc.setQueriesData({ queryKey: ["video"] }, (old: any) => {
          if (!old || old.id !== videoId) return old;
          return { ...old, comment_count: (old.comment_count ?? 0) + 1 };
        });
      }
    },
    onError: (err: Error) => {
      toast.error("Failed to post comment", { description: err.message });
    },
  });
}

export function useCreateVideo() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (video: {
      title: string;
      description?: string;
      category?: string;
      tags?: string[];
      is_public?: boolean;
      visibility?: string;
      scheduled_publish_at?: string;
      mux_asset_id?: string;
      playback_id?: string;
      thumbnail_url?: string;
      duration_seconds?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const visibility = video.visibility || "public";
      const isPublic = visibility === "public" && !video.scheduled_publish_at;
      const { data, error } = await tables.videos()
        .insert({
          creator_id: user.id,
          title: video.title,
          description: video.description || "",
          category: video.category || "Other",
          tags: video.tags || [],
          is_public: isPublic,
          visibility,
          scheduled_publish_at: video.scheduled_publish_at || null,
          mux_asset_id: video.mux_asset_id,
          playback_id: video.playback_id,
          thumbnail_url: video.thumbnail_url,
          duration_seconds: video.duration_seconds || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to save video", { description: err.message });
    },
  });
}
