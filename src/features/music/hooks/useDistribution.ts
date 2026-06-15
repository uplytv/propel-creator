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

export type ReleaseStatus =
  | "not_submitted"
  | "submitted"
  | "pending_review"
  | "live"
  | "rejected"
  | "removed";

export const RELEASE_STATUSES: { value: ReleaseStatus; label: string }[] = [
  { value: "not_submitted", label: "Not submitted" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_review", label: "Pending review" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "removed", label: "Removed" },
];

export type DistributionTarget = {
  id: string;
  release_id: string;
  platform: string;
  status: ReleaseStatus;
  external_id: string | null;
  external_url: string | null;
  error_message: string | null;
  delivered_at: string | null;
  live_at: string | null;
  live_url: string | null;
  notes: string | null;
  status_updated_at: string | null;
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

export const DSP_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  amazon_music: "Amazon Music",
  youtube_music: "YouTube Music",
  tidal: "Tidal",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
};

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

/**
 * Update a single release-tracker row (status / live URL / notes).
 * Upserts by (release_id, platform). UPLY does not deliver to any DSP — this
 * only records what the creator has submitted via their distributor.
 */
export function useUpdateReleaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      releaseId: string;
      platform: string;
      status: ReleaseStatus;
      liveUrl?: string | null;
      notes?: string | null;
    }) => {
      const row: any = {
        release_id: input.releaseId,
        platform: input.platform,
        status: input.status,
      };
      if (input.liveUrl !== undefined) row.live_url = input.liveUrl;
      if (input.notes !== undefined) row.notes = input.notes;
      const { error } = await supabase
        .from("music_distribution_targets")
        .upsert(row, { onConflict: "release_id,platform" });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["distribution-targets", v.releaseId] });
      qc.invalidateQueries({ queryKey: ["distribution-releases"] });
      qc.invalidateQueries({ queryKey: ["universal-links"] });
    },
  });
}

/** Bulk-flip not_submitted → submitted across all DSPs for a release. */
export function useMarkAllSubmitted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ releaseId, platforms }: { releaseId: string; platforms: string[] }) => {
      const { data: existing } = await supabase
        .from("music_distribution_targets")
        .select("platform,status")
        .eq("release_id", releaseId);
      const existingPlatforms = new Set((existing ?? []).map((r: any) => r.platform));
      const toInsert = platforms
        .filter((p) => !existingPlatforms.has(p))
        .map((p) => ({ release_id: releaseId, platform: p, status: "submitted" }));
      if (toInsert.length) {
        const { error } = await supabase.from("music_distribution_targets").insert(toInsert);
        if (error) throw error;
      }
      const { error: uErr } = await supabase
        .from("music_distribution_targets")
        .update({ status: "submitted" })
        .eq("release_id", releaseId)
        .eq("status", "not_submitted");
      if (uErr) throw uErr;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["distribution-targets", v.releaseId] });
      qc.invalidateQueries({ queryKey: ["distribution-releases"] });
    },
  });
}

/**
 * @deprecated Use `useUpdateReleaseStatus` per platform. Kept for one batch to
 * avoid breaking older callers. UPLY does not deliver to DSPs; this just marks
 * the platforms as submitted in the local Release Tracker.
 */
export function useSubmitToDSPs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ releaseId, platforms }: { releaseId: string; platforms: string[] }) => {
       
      console.warn(
        "[useSubmitToDSPs] deprecated — use useUpdateReleaseStatus. UPLY does not deliver to DSPs."
      );
      const rows = platforms.map((p) => ({
        release_id: releaseId,
        platform: p,
        status: "submitted",
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
