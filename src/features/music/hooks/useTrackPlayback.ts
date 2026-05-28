import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrackPlaybackResult {
  access: "full" | "preview";
  playback_url?: string | null;
  mux_playback_id?: string | null;
  preview_url?: string | null;
  expires_in?: number;
  allow_download?: boolean;
}

/**
 * Resolves a playable URL for a track via the service-role
 * `get-track-playback` edge function.
 *
 * - Unlocked → returns the regular Mux playback URL.
 * - Locked + user has access → returns a short-TTL signed URL.
 * - Locked + no access → access='preview' with preview_url.
 */
export function useTrackPlayback() {
  return useMutation<TrackPlaybackResult, Error, string>({
    mutationFn: async (trackId: string) => {
      const { data, error } = await supabase.functions.invoke("get-track-playback", {
        body: { trackId },
      });
      // Edge function returns 403 with preview_url when no access — surface as data, not error
      if (error && !data) throw error;
      return data as TrackPlaybackResult;
    },
  });
}
