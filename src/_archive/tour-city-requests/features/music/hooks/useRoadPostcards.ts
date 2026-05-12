import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PostcardMood = "hyped" | "tired" | "grateful" | "homesick" | "curious" | "party";
export type PostcardStatus = "draft" | "published" | "archived";

export interface RoadPostcard {
  id: string;
  artist_id: string;
  city: string;
  country: string | null;
  postcard_date: string;
  image_url: string | null;
  message: string;
  mood: PostcardMood | null;
  status: PostcardStatus;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export function useRoadPostcards(artistId?: string) {
  return useQuery({
    queryKey: ["music-road-postcards", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<RoadPostcard[]> => {
      const { data, error } = await (supabase as any)
        .from("music_road_postcards")
        .select("*")
        .eq("artist_id", artistId)
        .order("postcard_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoadPostcard[];
    },
  });
}

export function useMyPostcardLikes(artistId?: string) {
  return useQuery({
    queryKey: ["music-road-postcards-my-likes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Set();
      const { data: cards } = await (supabase as any)
        .from("music_road_postcards")
        .select("id")
        .eq("artist_id", artistId);
      const ids = (cards ?? []).map((c: any) => c.id);
      if (!ids.length) return new Set();
      const { data, error } = await (supabase as any)
        .from("music_road_postcard_likes")
        .select("postcard_id")
        .eq("fan_id", u.user.id)
        .in("postcard_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.postcard_id));
    },
  });
}

export function useCreatePostcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      city: string;
      message: string;
      country?: string | null;
      postcard_date?: string;
      image_url?: string | null;
      mood?: PostcardMood | null;
      status?: PostcardStatus;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_road_postcards")
        .insert({
          artist_id: u.user.id,
          city: input.city,
          message: input.message,
          country: input.country ?? null,
          postcard_date: input.postcard_date ?? new Date().toISOString().slice(0, 10),
          image_url: input.image_url ?? null,
          mood: input.mood ?? null,
          status: input.status ?? "published",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as RoadPostcard;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-road-postcards", row.artist_id] });
    },
  });
}

export function useTogglePostcardLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postcard_id: string; artist_id: string; liked: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (input.liked) {
        const { error } = await (supabase as any)
          .from("music_road_postcard_likes")
          .delete()
          .eq("postcard_id", input.postcard_id)
          .eq("fan_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_road_postcard_likes")
          .insert({ postcard_id: input.postcard_id, fan_id: u.user.id });
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-road-postcards", input.artist_id] });
      qc.invalidateQueries({ queryKey: ["music-road-postcards-my-likes", input.artist_id] });
    },
  });
}
