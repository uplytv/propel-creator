import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UniversalLink {
  id: string;
  track_id: string;
  platform: string;
  url: string;
}

export const UNIVERSAL_PLATFORMS = [
  { id: "spotify", name: "Spotify" },
  { id: "apple_music", name: "Apple Music" },
  { id: "youtube_music", name: "YouTube Music" },
  { id: "tidal", name: "Tidal" },
  { id: "soundcloud", name: "SoundCloud" },
  { id: "deezer", name: "Deezer" },
  { id: "bandcamp", name: "Bandcamp" },
];

export function useUniversalLinks(trackId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["universal-links", trackId],
    queryFn: async (): Promise<UniversalLink[]> => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from("track_universal_links")
        .select("*")
        .eq("track_id", trackId);
      if (error) throw error;
      return (data ?? []) as UniversalLink[];
    },
    enabled: !!trackId,
  });

  const upsert = useMutation({
    mutationFn: async (input: { platform: string; url: string }) => {
      if (!trackId) throw new Error("No track");
      const { error } = await supabase
        .from("track_universal_links")
        .upsert({ track_id: trackId, ...input }, { onConflict: "track_id,platform" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["universal-links", trackId] });
      toast({ title: "Saved" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("track_universal_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["universal-links", trackId] }),
  });

  return { ...query, upsert, remove };
}
