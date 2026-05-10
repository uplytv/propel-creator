import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MoodBoardItemKind = "image" | "track" | "quote" | "link";

export interface MoodBoard {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  mood: string | null;
  cover_url: string | null;
  is_published: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface MoodBoardItem {
  id: string;
  board_id: string;
  kind: MoodBoardItemKind;
  url: string | null;
  caption: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useMoodBoards(artistId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["music_mood_boards", artistId, !!opts?.includeDrafts],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("music_mood_boards")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (!opts?.includeDrafts) q = q.eq("is_published", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MoodBoard[];
    },
  });
}

export function useMoodBoard(id?: string) {
  return useQuery({
    queryKey: ["music_mood_board", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("music_mood_boards")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as MoodBoard | null;
    },
  });
}

export function useMoodBoardItems(boardId?: string) {
  return useQuery({
    queryKey: ["music_mood_board_items", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("music_mood_board_items")
        .select("*")
        .eq("board_id", boardId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MoodBoardItem[];
    },
  });
}

export function useMyMoodBoardLike(boardId?: string) {
  return useQuery({
    queryKey: ["music_mood_board_like", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const { data, error } = await (supabase as any)
        .from("music_mood_board_likes")
        .select("id")
        .eq("board_id", boardId)
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useCreateMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      mood?: string | null;
      cover_url?: string | null;
      is_published?: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_mood_boards")
        .insert({ ...input, artist_id: uid })
        .select("*")
        .single();
      if (error) throw error;
      return data as MoodBoard;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["music_mood_boards", b.artist_id] });
    },
  });
}

export function useAddMoodBoardItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      board_id: string;
      kind: MoodBoardItemKind;
      url?: string | null;
      caption?: string | null;
      position?: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from("music_mood_board_items")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as MoodBoardItem;
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["music_mood_board_items", item.board_id] });
    },
  });
}

export function useToggleMoodBoardLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, liked }: { boardId: string; liked: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      if (liked) {
        const { error } = await (supabase as any)
          .from("music_mood_board_likes")
          .delete()
          .eq("board_id", boardId)
          .eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_mood_board_likes")
          .insert({ board_id: boardId, user_id: uid });
        if (error) throw error;
      }
      return !liked;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_mood_board_like", vars.boardId] });
      qc.invalidateQueries({ queryKey: ["music_mood_board", vars.boardId] });
      qc.invalidateQueries({ queryKey: ["music_mood_boards"] });
    },
  });
}
