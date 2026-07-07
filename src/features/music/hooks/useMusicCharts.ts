import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChartEntry {
  id: string;
  chart_type: string;
  period: string;
  region: string;
  snapshot_date: string;
  item_ref_id: string;
  item_title: string | null;
  item_subtitle: string | null;
  item_image_url: string | null;
  rank: number;
  prev_rank: number | null;
  score: number;
}

export function useMusicChart(
  chartType: "tracks" | "albums" | "artists" = "tracks",
  period: "daily" | "weekly" | "monthly" = "weekly",
  region = "global",
  limit = 50,
) {
  return useQuery({
    queryKey: ["music-chart", chartType, period, region, limit],
    queryFn: async () => {
      const { data: latest, error: e1 } = await supabase
        .from("music_chart_snapshots")
        .select("snapshot_date")
        .eq("chart_type", chartType)
        .eq("period", period)
        .eq("region", region)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e1) throw e1;
      if (!latest) return [] as ChartEntry[];

      const { data, error } = await supabase
        .from("music_chart_snapshots")
        .select("*")
        .eq("chart_type", chartType)
        .eq("period", period)
        .eq("region", region)
        .eq("snapshot_date", latest.snapshot_date)
        .order("rank", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ChartEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
