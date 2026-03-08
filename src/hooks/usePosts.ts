import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Post {
  id: string;
  user_id: string;
  content: string;
  category: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

export function usePosts(category?: string) {
  return useQuery({
    queryKey: ["posts", category],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (category && category !== "All Posts") {
        const catMap: Record<string, string> = {
          Announcements: "announcement",
          Questions: "question",
          Wins: "win",
        };
        if (catMap[category]) {
          query = query.eq("category", catMap[category]);
        }
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      // Fetch author profiles
      const userIds = [...new Set((posts || []).map((p: any) => p.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (posts || []).map((p: any) => ({
        ...p,
        author_name: (profileMap.get(p.user_id) as any)?.display_name || "Creator",
        author_avatar: (profileMap.get(p.user_id) as any)?.avatar_url || null,
      }));
    },
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      category,
    }: {
      content: string;
      category: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content,
        category,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("like_count")
        .eq("id", postId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("posts")
        .update({ like_count: ((data as any)?.like_count || 0) + 1 } as any)
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
