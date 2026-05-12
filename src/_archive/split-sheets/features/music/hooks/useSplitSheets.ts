import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface SplitSheet {
  id: string;
  created_by: string;
  track_id: string | null;
  song_title: string;
  work_title: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface SplitWriter {
  id: string;
  sheet_id: string;
  writer_user_id: string | null;
  writer_name: string;
  writer_email: string | null;
  role: string;
  writing_share_pct: number;
  publishing_share_pct: number;
  pro_affiliation: string | null;
  signed_at: string | null;
}

export function useMySplitSheets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["split-sheets", user?.id],
    queryFn: async () => {
      if (!user) return [] as SplitSheet[];
      const { data, error } = await (supabase as any)
        .from("music_split_sheets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SplitSheet[];
    },
    enabled: !!user,
  });
}

export function useSheetWriters(sheetId?: string) {
  return useQuery({
    queryKey: ["split-writers", sheetId],
    queryFn: async () => {
      if (!sheetId) return [] as SplitWriter[];
      const { data, error } = await (supabase as any)
        .from("music_split_sheet_writers")
        .select("*")
        .eq("sheet_id", sheetId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SplitWriter[];
    },
    enabled: !!sheetId,
  });
}

export function useCreateSheet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SplitSheet>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("music_split_sheets")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SplitSheet;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["split-sheets"] }),
  });
}

export function useAddWriter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SplitWriter> & { sheet_id: string; writer_name: string }) => {
      const { data, error } = await (supabase as any)
        .from("music_split_sheet_writers")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SplitWriter;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["split-writers", vars.sheet_id] }),
  });
}

export function useUpdateSheetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("music_split_sheets")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["split-sheets"] }),
  });
}

export function useSignAsWriter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (writerRowId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("music_split_sheet_writers")
        .update({ signed_at: new Date().toISOString() })
        .eq("id", writerRowId)
        .eq("writer_user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["split-writers"] }),
  });
}
