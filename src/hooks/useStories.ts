import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";

export function useStories() {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories", user?.id, followingIds],
    queryFn: async () => {
      if (!user) return [];
      const userIds = [user.id, ...followingIds];
      // Fetch stories first
      const { data: storiesData, error } = await supabase
        .from("stories")
        .select("*")
        .in("user_id", userIds)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!storiesData || storiesData.length === 0) return [];

      // Fetch profiles for story authors
      const authorIds = Array.from(new Set(storiesData.map((s: any) => String(s.user_id))));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", authorIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Attach profile data to each story
      return storiesData.map((s: any) => ({
        ...s,
        profiles: profileMap.get(s.user_id) || null,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const groupedStories = stories.reduce((acc: Record<string, any[]>, story: any) => {
    const uid = story.user_id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(story);
    return acc;
  }, {});

  const markViewed = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) return;
      await supabase
        .from("story_views")
        .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: "story_id,viewer_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const createStory = useMutation({
    mutationFn: async (params: { mediaUrl: string; mediaType?: string; caption?: string; eventId?: string; locationLabel?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: params.mediaUrl,
        media_type: params.mediaType || "image",
        caption: params.caption,
        event_id: params.eventId || null,
        location_label: params.locationLabel,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const getViewers = useCallback(async (storyId: string) => {
    const { data } = await supabase
      .from("story_views")
      .select("viewer_id, viewed_at, profiles:viewer_id(display_name, avatar_url)")
      .eq("story_id", storyId);
    return data || [];
  }, []);

  return {
    stories,
    groupedStories,
    isLoading,
    markViewed: markViewed.mutate,
    createStory: createStory.mutateAsync,
    getViewers,
  };
}
