import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface ShortComment {
  id: string;
  short_id: string;
  source: "clip" | "short";
  user_id: string;
  body: string;
  like_count: number;
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function useShortComments(shortId?: string, source?: "clip" | "short") {
  const qc = useQueryClient();
  const key = ["short-comments", shortId];

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ShortComment[]> => {
      if (!shortId) return [];
      const { data, error } = await (supabase as any)
        .from("short_comments")
        .select("*")
        .eq("short_id", shortId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const comments = (data || []) as ShortComment[];
      const userIds = [...new Set(comments.map((c) => c.user_id))];
      if (!userIds.length) return comments;
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const map = new Map((profiles as any[] || []).map((p: any) => [p.user_id, p]));
      return comments.map((c) => ({
        ...c,
        display_name: map.get(c.user_id)?.display_name || null,
        avatar_url: map.get(c.user_id)?.avatar_url || null,
      }));
    },
    enabled: !!shortId,
  });

  // Realtime subscription so the count + list update instantly
  useEffect(() => {
    if (!shortId) return;
    const channel = supabase
      .channel(`short-comments-${shortId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "short_comments", filter: `short_id=eq.${shortId}` },
        () => qc.invalidateQueries({ queryKey: key })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shortId]);

  return query;
}

export function useAddShortComment(shortId?: string, source?: "clip" | "short") {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Sign in to comment");
      if (!shortId || !source) throw new Error("Missing context");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Comment is empty");
      const { error } = await (supabase as any)
        .from("short_comments")
        .insert({ short_id: shortId, source, user_id: user.id, body: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["short-comments", shortId] });
    },
    onError: (err: Error) => toast.error("Couldn't post comment", { description: err.message }),
  });
}
