import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type PresaveCampaignStatus = "draft" | "active" | "released" | "cancelled";

export interface PresaveCampaignRow {
  id: string;
  track_id: string;
  creator_id: string;
  release_at: string;
  spotify_track_uri: string | null;
  apple_album_id: string | null;
  status: PresaveCampaignStatus;
  distribution_confirmed_spotify: boolean;
  distribution_confirmed_apple: boolean;
  campaign_url_slug: string | null;
  cover_art_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeSpotifyUri(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  if (uriMatch) return `spotify:track:${uriMatch[1]}`;
  const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (urlMatch) return `spotify:track:${urlMatch[1]}`;
  return trimmed;
}

export function usePresaveCampaign(trackId?: string) {
  return useQuery({
    queryKey: ["presave-campaign-by-track", trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presave_campaigns")
        .select("*")
        .eq("track_id", trackId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PresaveCampaignRow | null;
    },
  });
}

export function usePresaveCampaignBySlug(slug?: string) {
  return useQuery({
    queryKey: ["presave-campaign-by-slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presave_campaigns")
        .select("*")
        .eq("campaign_url_slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PresaveCampaignRow | null;
    },
  });
}

export function usePresaveSubscriberCount(campaignId?: string) {
  return useQuery({
    queryKey: ["presave-subscribers-count", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("presave_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId!);
      if (error) return 0;
      return count ?? 0;
    },
  });
}

export function useUpsertPresaveCampaign() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<PresaveCampaignRow> & { track_id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const payload: any = {
        ...input,
        creator_id: user.id,
        spotify_track_uri: normalizeSpotifyUri(input.spotify_track_uri ?? null),
      };
      const { data, error } = await supabase
        .from("presave_campaigns")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data as PresaveCampaignRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["presave-campaign-by-track", data.track_id] });
      qc.invalidateQueries({ queryKey: ["presave-campaign-by-slug", data.campaign_url_slug] });
    },
  });
}

export interface PresaveCampaignAnalytics {
  total: number;
  byPlatform: { spotify: number; apple_music: number; email_only: number };
  consent: { saveTrack: number; followArtist: number; saveRate: number; followRate: number };
  fulfillment: {
    fulfilled: number;
    pending: number;
    failed: number;
    fulfillmentRate: number;
    lastFulfilledAt: string | null;
    complete: boolean;
  };
}

export function usePresaveCampaignAnalytics(campaignId?: string, releaseAt?: string | null) {
  return useQuery({
    queryKey: ["presave-campaign-analytics", campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<PresaveCampaignAnalytics> => {
      const { data, error } = await supabase
        .from("presave_subscribers")
        .select("platform, consent_save_track, consent_follow_artist, fulfilled, fulfilled_at, failure_reason")
        .eq("campaign_id", campaignId!);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        platform: string;
        consent_save_track: boolean | null;
        consent_follow_artist: boolean | null;
        fulfilled: boolean | null;
        fulfilled_at: string | null;
        failure_reason: string | null;
      }>;
      const total = rows.length;
      const byPlatform = { spotify: 0, apple_music: 0, email_only: 0 };
      let saveTrack = 0;
      let followArtist = 0;
      let fulfilled = 0;
      let failed = 0;
      let lastFulfilledAt: string | null = null;
      for (const r of rows) {
        if (r.platform === "spotify") byPlatform.spotify++;
        else if (r.platform === "apple_music") byPlatform.apple_music++;
        else byPlatform.email_only++;
        if (r.consent_save_track) saveTrack++;
        if (r.consent_follow_artist) followArtist++;
        if (r.fulfilled) {
          fulfilled++;
          if (r.fulfilled_at && (!lastFulfilledAt || r.fulfilled_at > lastFulfilledAt)) {
            lastFulfilledAt = r.fulfilled_at;
          }
        } else if (r.failure_reason) {
          failed++;
        }
      }
      const pending = total - fulfilled - failed;
      const released = releaseAt ? new Date(releaseAt).getTime() <= Date.now() : false;
      return {
        total,
        byPlatform,
        consent: {
          saveTrack,
          followArtist,
          saveRate: total ? saveTrack / total : 0,
          followRate: total ? followArtist / total : 0,
        },
        fulfillment: {
          fulfilled,
          pending,
          failed,
          fulfillmentRate: total ? fulfilled / total : 0,
          lastFulfilledAt,
          complete: released && total > 0 && pending === 0,
        },
      };
    },
  });
}

export function usePresaveSubscribe() {
  return useMutation({
    mutationFn: async (input: {
      campaign_id?: string;
      campaign_slug?: string;
      email: string;
      platform: "apple_music" | "email_only";
      apple_music_user_token?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("presave-subscribe", { body: input });
      if (error) throw error;
      return data;
    },
  });
}
