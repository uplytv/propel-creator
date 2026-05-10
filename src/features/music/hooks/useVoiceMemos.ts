import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVoiceMemos(artistId?: string) {
  return useQuery({
    queryKey: ["music_voice_memos", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_voice_memos")
        .select("*")
        .eq("artist_id", artistId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVoiceMemo(id?: string) {
  return useQuery({
    queryKey: ["music_voice_memo", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_voice_memos")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useVoiceMemoReplies(memoId?: string) {
  return useQuery({
    queryKey: ["music_voice_memo_replies", memoId],
    enabled: !!memoId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_voice_memo_replies")
        .select("*")
        .eq("memo_id", memoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyVoiceMemoLikes(artistId?: string) {
  return useQuery({
    queryKey: ["music_voice_memo_my_likes", artistId],
    enabled: !!artistId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return new Set<string>();
      const { data: memos } = await supabase
        .from("music_voice_memos")
        .select("id")
        .eq("artist_id", artistId!);
      const ids = (memos ?? []).map((m: any) => m.id);
      if (!ids.length) return new Set<string>();
      const { data, error } = await supabase
        .from("music_voice_memo_likes")
        .select("memo_id")
        .eq("fan_id", uid)
        .in("memo_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((l: any) => l.memo_id));
    },
  });
}

export function useCreateVoiceMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      artist_id: string;
      audio_url: string;
      duration_seconds?: number;
      caption?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("music_voice_memos")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row: any) =>
      qc.invalidateQueries({ queryKey: ["music_voice_memos", row.artist_id] }),
  });
}

export function useToggleVoiceMemoLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memo_id: string; artist_id: string; on: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      if (input.on) {
        const { error } = await supabase
          .from("music_voice_memo_likes")
          .insert({ memo_id: input.memo_id, fan_id: uid } as any);
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("music_voice_memo_likes")
          .delete()
          .eq("memo_id", input.memo_id)
          .eq("fan_id", uid);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["music_voice_memos", vars.artist_id] });
      qc.invalidateQueries({ queryKey: ["music_voice_memo_my_likes", vars.artist_id] });
    },
  });
}

export function useReplyToVoiceMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memo_id: string; body: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_voice_memo_replies")
        .insert({ memo_id: input.memo_id, fan_id: uid, body: input.body } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["music_voice_memo_replies", row.memo_id] });
      qc.invalidateQueries({ queryKey: ["music_voice_memo", row.memo_id] });
    },
  });
}
