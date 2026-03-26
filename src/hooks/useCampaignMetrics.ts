import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MetricPoint {
  time: string;
  imp: number;
  clicks: number;
  conv: number;
  spent: number;
}

export function useCampaignMetrics(campaignId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaign_metrics", campaignId],
    queryFn: async (): Promise<MetricPoint[]> => {
      const { data, error } = await supabase
        .from("campaign_metrics")
        .select("recorded_at, impressions, clicks, conversions, spent")
        .eq("campaign_id", campaignId!)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Aggregate into ~20 buckets for clean chart display
      const rows = data as unknown as {
        recorded_at: string;
        impressions: number;
        clicks: number;
        conversions: number;
        spent: number;
      }[];

      if (rows.length <= 20) {
        return rows.map((r, i) => ({
          time: `T${i + 1}`,
          imp: r.impressions,
          clicks: r.clicks,
          conv: r.conversions,
          spent: Number(r.spent),
        }));
      }

      // Downsample to ~20 points by taking evenly spaced samples
      const step = Math.floor(rows.length / 20);
      const sampled: MetricPoint[] = [];
      for (let i = 0; i < rows.length; i += step) {
        const r = rows[i];
        sampled.push({
          time: `T${sampled.length + 1}`,
          imp: r.impressions,
          clicks: r.clicks,
          conv: r.conversions,
          spent: Number(r.spent),
        });
        if (sampled.length >= 20) break;
      }
      return sampled;
    },
    enabled: !!user && !!campaignId,
    staleTime: 30_000,
  });
}
