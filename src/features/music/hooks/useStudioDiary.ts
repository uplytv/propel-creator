import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StudioPhase =
  | "writing"
  | "recording"
  | "producing"
  | "mixing"
  | "mastering"
  | "release_prep";
export type StudioMood =
  | "flow"
  | "grind"
  | "breakthrough"
  | "stuck"
  | "exhausted"
  | "hyped";
export type DiaryStatus = "draft" | "published" | "archived";
export type DiaryReaction = "fire" | "heart" | "clap" | "mindblown";

export interface StudioDiaryEntry {
  id: string;
  artist_id: string;
  session_date: string;
  phase: StudioPhase;
  title: string;
  notes: string | null;
  hours_logged: number | null;
  mood: StudioMood | null;
  clip_url: string | null;
  status: DiaryStatus;
  reaction_count: number;
  created_at: string;
  updated_at: string;
}

export function useStudioDiary(artistId?: string) {
  return useQuery({
    queryKey: ["music-studio-diary", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<StudioDiaryEntry[]> => {
      const { data, error } = await (supabase as any)
        .from("music_studio_diary_entries")
        .select("*")
        .eq("artist_id", artistId)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudioDiaryEntry[];
    },
  });
}

export function useMyDiaryReactions(artistId?: string) {
  return useQuery({
    queryKey: ["music-studio-diary-my-reactions", artistId],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, DiaryReaction>> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return {};
      const { data: entries } = await (supabase as any)
        .from("music_studio_diary_entries")
        .select("id")
        .eq("artist_id", artistId);
      const ids = (entries ?? []).map((e: any) => e.id);
      if (!ids.length) return {};
      const { data, error } = await (supabase as any)
        .from("music_studio_diary_reactions")
        .select("entry_id, reaction")
        .eq("fan_id", u.user.id)
        .in("entry_id", ids);
      if (error) throw error;
      const map: Record<string, DiaryReaction> = {};
      for (const r of data ?? []) map[r.entry_id] = r.reaction as DiaryReaction;
      return map;
    },
  });
}

export function useCreateDiaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      phase: StudioPhase;
      session_date?: string;
      notes?: string | null;
      hours_logged?: number | null;
      mood?: StudioMood | null;
      clip_url?: string | null;
      status?: DiaryStatus;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("music_studio_diary_entries")
        .insert({
          artist_id: u.user.id,
          title: input.title,
          phase: input.phase,
          session_date: input.session_date ?? new Date().toISOString().slice(0, 10),
          notes: input.notes ?? null,
          hours_logged: input.hours_logged ?? null,
          mood: input.mood ?? null,
          clip_url: input.clip_url ?? null,
          status: input.status ?? "published",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as StudioDiaryEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["music-studio-diary", row.artist_id] });
    },
  });
}

export function useToggleDiaryReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entry_id: string;
      artist_id: string;
      reaction: DiaryReaction;
      current?: DiaryReaction | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (input.current === input.reaction) {
        const { error } = await (supabase as any)
          .from("music_studio_diary_reactions")
          .delete()
          .eq("entry_id", input.entry_id)
          .eq("fan_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("music_studio_diary_reactions")
          .upsert(
            {
              entry_id: input.entry_id,
              fan_id: u.user.id,
              reaction: input.reaction,
            },
            { onConflict: "entry_id,fan_id" },
          );
        if (error) throw error;
      }
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["music-studio-diary", input.artist_id] });
      qc.invalidateQueries({ queryKey: ["music-studio-diary-my-reactions", input.artist_id] });
    },
  });
}
