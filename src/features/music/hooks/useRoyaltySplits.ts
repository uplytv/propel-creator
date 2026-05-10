import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RoyaltySplit {
  id: string;
  track_id: string;
  collaborator_id: string;
  role: string;
  percent: number;
  created_at: string;
}

export function useRoyaltySplits(trackId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["royalty-splits", trackId],
    queryFn: async (): Promise<RoyaltySplit[]> => {
      if (!trackId) return [];
      const { data, error } = await (supabase as any)
        .from("track_royalty_splits")
        .select("*")
        .eq("track_id", trackId)
        .order("percent", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoyaltySplit[];
    },
    enabled: !!trackId,
  });

  const addSplit = useMutation({
    mutationFn: async (input: { collaborator_id: string; role: string; percent: number }) => {
      if (!trackId) throw new Error("No track");
      const { error } = await (supabase as any).from("track_royalty_splits").insert({
        track_id: trackId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["royalty-splits", trackId] });
      toast({ title: "Split added" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const removeSplit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("track_royalty_splits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["royalty-splits", trackId] }),
  });

  const totalPercent = (query.data ?? []).reduce((s, r) => s + Number(r.percent || 0), 0);

  return { ...query, addSplit, removeSplit, totalPercent };
}
