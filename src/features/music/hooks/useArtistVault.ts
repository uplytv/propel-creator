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
      const { data, error } = await supabase
        .from("tracks")
        .select("id, title, cover_art_url, is_locked, unlock_type, unlock_price_cents, required_tier_id, preview_url, preview_duration_seconds, creator_id, release_status, scheduled_release_at, created_at")
        .eq("creator_id", creatorId!)
        .eq("is_locked", true)
        .eq("is_published", true);
      if (error) throw error;
      const rows = data ?? [];
      // Order: scheduled (by soonest scheduled_release_at) → unreleased → others, then newest first
      const statusRank = (s: string | null) => {
        if (s === "scheduled") return 0;
        if (s === "unreleased") return 1;
        return 2;
      };
      return [...rows].sort((a: any, b: any) => {
        const ra = statusRank(a.release_status);
        const rb = statusRank(b.release_status);
        if (ra !== rb) return ra - rb;
        if (a.release_status === "scheduled" && b.release_status === "scheduled") {
          const ta = a.scheduled_release_at ? new Date(a.scheduled_release_at).getTime() : Infinity;
          const tb = b.scheduled_release_at ? new Date(b.scheduled_release_at).getTime() : Infinity;
          if (ta !== tb) return ta - tb;
        }
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return cb - ca;
      });

  });
}
