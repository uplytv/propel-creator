import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DistributionRelease = {
  id: string;
  owner_id: string;
  track_id: string | null;
  title: string;
  artist_name: string;
  upc: string | null;
  isrc: string | null;
  release_date: string | null;
  artwork_url: string | null;
  audio_url: string | null;
  genre: string | null;
  language: string | null;
  explicit: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DistributionTarget = {
  id: string;
  release_id: string;
  platform: string;
  status: string;
  external_id: string | null;
  external_url: string | null;
  error_message: string | null;
  delivered_at: string | null;
  live_at: string | null;
};

export const SUPPORTED_DSPS = [
  "spotify",
  "apple_music",
  "amazon_music",
  "youtube_music",
  "tidal",
  "deezer",
  "soundcloud",
];

export function useMyReleases() {
  return useQuery({
    queryKey: ["distribution-releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_distribution_releases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DistributionRelease[];
    },
  });
}

export function useReleaseTargets(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["distribution-targets", releaseId],
    enabled: !!releaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_distribution_targets")
        .select("*")
        .eq("release_id", releaseId!);
      if (error) throw error;
      return data as DistributionTarget[];
    },
  });
}

export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DistributionRelease> & { title: string; artist_name: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_distribution_releases")
        .insert({ ...input, owner_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as DistributionRelease;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["distribution-releases"] }),
  });
}

export function useSubmitToDSPs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ releaseId, platforms }: { releaseId: string; platforms: string[] }) => {
      const rows = platforms.map((p) => ({
        release_id: releaseId,
        platform: p,
        status: "submitted",
        delivered_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("music_distribution_targets")
        .upsert(rows, { onConflict: "release_id,platform" });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["distribution-targets", v.releaseId] });
      qc.invalidateQueries({ queryKey: ["distribution-releases"] });
    },
  });
}
