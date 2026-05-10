import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConcertMemory {
  id: string;
  artist_id: string;
  fan_id: string;
  media_type: "photo" | "video";
  media_url: string;
  caption: string | null;
  venue: string | null;
  city: string | null;
  concert_date: string | null;
  status: "visible" | "hidden" | "removed";
  like_count: number;
  created_at: string;
}

export function useConcertMemories(artistId?: string) {
  return useQuery({
    queryKey: ["music-concert-memories", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<ConcertMemory[]> => {
      const { data, error } = await (supabase as any)
        .from("music_concert_memories")
        .select("*")
        .eq("artist_id", artistId)
        .eq("status", "visible")
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ConcertMemory[];
    },
  });
}

export function useMyMemoryLikes(artistId?: string) {
  return useQuery({
    queryKey: ["music-my-memory-likes", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Set();
      const { data, error } = await (supabase as any)
        .from("music_concert_memory_likes")
        .select("memory_id")
        .eq("fan_id", u.user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: { memory_id: string }) => r.memory_id));
    },
  });
}

export function useSubmitConcertMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      media_type: "photo" | "video";
      media_url: string;
      caption?: string;
      venue?: string;
      city?: string;
      concert_date?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_concert_memories")
        .insert({
          artist_id: input.artist_id,
          fan_id: u.user.id,
          media_type: input.media_type,
          media_url: input.media_url,
          caption: input.caption ?? null,
          venue: input.venue ?? null,
          city: input.city ?? null,
          concert_date: input.concert_date ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ConcertMemory;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-concert-memories", row.artist_id] });
    },
  });
}

export function useToggleMemoryLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memory_id: string; artist_id: string; liked: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (input.liked) {
        const { error } = await (supabase as any)
          .from("music_concert_memory_likes")
          .delete()
          .eq("memory_id", input.memory_id)
          .eq("fan_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_concert_memory_likes")
          .insert({ memory_id: input.memory_id, fan_id: u.user.id });
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-concert-memories", input.artist_id] });
      qc.invalidateQueries({ queryKey: ["music-my-memory-likes", input.artist_id] });
    },
  });
}
