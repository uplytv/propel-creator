import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";

const PAGE_SIZE = 20;

export function useSocialPosts(options?: { friendsOnly?: boolean }) {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["social-posts", user?.id, followingIds, options?.friendsOnly],
    queryFn: async ({ pageParam }) => {
      if (!user) return [] as any[];
      let query = (supabase as any)
        .from("social_posts")
        .select("*, profiles:user_id(display_name, avatar_url, username), events:event_id(title)")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) query = query.lt("created_at", pageParam);
      if (options?.friendsOnly && followingIds.length > 0) {
        query = query.in("user_id", followingIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any[]) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.created_at : undefined,
    enabled: !!user,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const posts = (data?.pages || []).flat();

  const createPost = useMutation({
    mutationFn: async (params: { content: string; mediaUrls?: string[]; eventId?: string; postType?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("social_posts").insert({
        user_id: user.id,
        content: params.content,
        media_urls: params.mediaUrls || [],
        event_id: params.eventId || null,
        post_type: params.postType || "general",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    },
  });

  const reactToPost = useMutation({
    mutationFn: async (params: { postId: string; reaction: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await (supabase as any)
        .from("social_post_reactions")
        .select("*")
        .eq("post_id", params.postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await (supabase as any).from("social_post_reactions").delete()
          .eq("post_id", params.postId).eq("user_id", user.id);
      } else {
        await (supabase as any).from("social_post_reactions").insert({
          post_id: params.postId,
          user_id: user.id,
          reaction: params.reaction,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    },
  });

  const addComment = useMutation({
    mutationFn: async (params: { postId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      await (supabase as any).from("social_post_comments").insert({
        post_id: params.postId,
        user_id: user.id,
        content: params.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    },
  });

  return {
    posts,
    isLoading,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    createPost: createPost.mutateAsync,
    reactToPost: reactToPost.mutate,
    addComment: addComment.mutateAsync,
  };
}
