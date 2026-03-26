import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useCreatorSpace(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["creator-space", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_spaces")
        .select("*")
        .eq("creator_id", creatorId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useEnsureSpace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("creator_spaces")
        .select("*")
        .eq("creator_id", user.id)
        .maybeSingle();
      if (existing) return existing;
      const { data, error } = await supabase
        .from("creator_spaces")
        .insert({ creator_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-space"] });
    },
  });
}

export function useUpdateSpace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("creator_spaces")
        .update(updates as any)
        .eq("creator_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-space"] });
    },
  });
}

export function useCommunityPosts(creatorId: string | undefined, category?: string) {
  return useQuery({
    queryKey: ["community-posts", creatorId, category],
    enabled: !!creatorId,
    queryFn: async () => {
      let query = supabase
        .from("community_posts")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;

      const posts = (data || []);
      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      if (authorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return posts.map((p) => ({
        ...p,
        author_name: (profileMap.get(p.author_id) as any)?.display_name || "Member",
        author_avatar: (profileMap.get(p.author_id) as any)?.avatar_url || null,
      }));
    },
  });
}

export function useCreateCommunityPost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: { creator_id: string; title: string; body: string; category: string; image_url?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_posts")
        .insert({ ...post, author_id: user.id });
      if (error) throw error;
      // Award points
      await supabase.from("member_points").insert({
        user_id: user.id,
        creator_id: post.creator_id,
        action_type: "post",
        points: 5,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, creatorId }: { postId: string; creatorId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("community_post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("community_post_likes").delete().eq("id", (existing as any).id);
        // Decrement handled below
        // Decrement manually
        const { data: post } = await supabase.from("community_posts").select("like_count").eq("id", postId).single();
        await supabase.from("community_posts").update({ like_count: Math.max(0, ((post as any)?.like_count || 1) - 1) }).eq("id", postId);
        return { liked: false };
      } else {
        await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });
        const { data: post } = await supabase.from("community_posts").select("like_count").eq("id", postId).single();
        await supabase.from("community_posts").update({ like_count: ((post as any)?.like_count || 0) + 1 }).eq("id", postId);
        // Award points
        await supabase.from("member_points").insert({
          user_id: user.id,
          creator_id: creatorId,
          action_type: "like_received",
          points: 1,
        });
        return { liked: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-likes"] });
    },
  });
}

export function useUserLikes(postIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-likes", postIds],
    enabled: !!user && postIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_post_likes")
        .select("post_id")
        .eq("user_id", user!.id)
        .in("post_id", postIds);
      return new Set((data || []).map((d: any) => d.post_id));
    },
  });
}

export function useCommunityComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["community-comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const comments = (data || []);
      const authorIds = [...new Set(comments.map((c) => c.author_id))];
      if (authorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return comments.map((c) => ({
        ...c,
        author_name: (profileMap.get(c.author_id) as any)?.display_name || "Member",
        author_avatar: (profileMap.get(c.author_id) as any)?.avatar_url || null,
      }));
    },
  });
}

export function useCreateComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, body, creatorId }: { postId: string; body: string; creatorId: string }) => {
      if (!user) throw new Error("Not authenticated");
      await supabase.from("community_comments").insert({ post_id: postId, author_id: user.id, body });
      // Update comment count
      const { data: post } = await supabase.from("community_posts").select("comment_count").eq("id", postId).single();
      await supabase.from("community_posts").update({ comment_count: ((post as any)?.comment_count || 0) + 1 }).eq("id", postId);
      // Award points
      await supabase.from("member_points").insert({
        user_id: user.id,
        creator_id: creatorId,
        action_type: "comment",
        points: 2,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-comments"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useCommunityCategories(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["community-categories", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_categories")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []);
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isPinned }: { postId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_pinned: !isPinned })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
