import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns all locked / unreleased tracks for an artist.
 * Used by the "Vault" tab on the artist page.
 */
export function useArtistVault(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["artist-vault", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id, title, cover_art_url, is_locked, unlock_type, unlock_price_cents, required_tier_id, preview_url, preview_duration_seconds, creator_id, release_status, scheduled_release_at")
        .eq("creator_id", creatorId!)
        .eq("is_locked", true)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
