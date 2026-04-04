import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  like_count: number;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

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
      // Try by slug first
      const { data: bySlug } = await tables.videos()
        .select("*")
        .eq("slug", slugOrId)
        .maybeSingle();
      if (bySlug) return bySlug as Video;
      // Fall back to ID lookup
      const { data: byId } = await tables.videos()
        .select("*")
        .eq("id", slugOrId)
        .maybeSingle();
      return (byId as Video) || null;
    },
    enabled: !!slugOrId,
  });
}

export function useVideoComments(videoId: string | undefined) {
  return useQuery({
    queryKey: ["video-comments", videoId],
    queryFn: async () => {
      const { data, error } = await tables.videoComments()
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as VideoComment[];
    },
    enabled: !!videoId,
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

export function useAddComment(videoId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      if (!user || !videoId) throw new Error("Not authenticated");
      const { error } = await tables.videoComments()
        .insert({ video_id: videoId, user_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-comments", videoId] });
      qc.invalidateQueries({ queryKey: ["video"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to post comment", { description: err.message });
    },
  });
}

export function useCreateVideo() {
  const { user } = useAuth();
  const { toast } = useToast();
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
