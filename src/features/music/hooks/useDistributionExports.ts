import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DistributionExport {
  id: string;
  track_id: string;
  artist_id: string;
  platform: string;
  status: string;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DISTRIBUTION_PLATFORMS = [
  { id: "spotify", name: "Spotify" },
  { id: "apple_music", name: "Apple Music" },
  { id: "youtube_music", name: "YouTube Music" },
  { id: "tidal", name: "Tidal" },
  { id: "amazon_music", name: "Amazon Music" },
  { id: "soundcloud", name: "SoundCloud" },
  { id: "deezer", name: "Deezer" },
];

export function useDistributionExports(trackId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["distribution-exports", trackId],
    queryFn: async (): Promise<DistributionExport[]> => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from("track_distribution_exports")
        .select("*")
        .eq("track_id", trackId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DistributionExport[];
    },
    enabled: !!trackId,
  });

  const requestExport = useMutation({
    mutationFn: async (platform: string) => {
      if (!trackId || !user) throw new Error("Not ready");
      const { error } = await supabase.from("track_distribution_exports").insert({
        track_id: trackId,
        artist_id: user.id,
        platform,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["distribution-exports", trackId] });
      toast({ title: "Export requested", description: "Your track is queued for distribution." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return { ...query, requestExport };
}
