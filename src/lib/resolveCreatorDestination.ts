/**
 * resolveCreatorDestination — never-404 routing for creator cards.
 *
 * Clicking a creator card resolves, in priority order:
 *   1. Their community/classroom  → /community/<user_id>   (creator_spaces row exists)
 *   2. Their UPLY profile         → /@<username>           (profiles row exists — the
 *      canonical profile path used app-wide; see usePublicProfilePath / shareUrls)
 *   3. Their curated artist site  → /<slug>-site           (every ARTIST_ROSTER entry
 *      has a site route mounted in App.tsx via the shared ArtistSiteTemplate)
 *   4. Absolute fallback          → /roster
 *
 * DB lookups mirror UsernameRedirect: the public `get_public_profile_by_username`
 * RPC across handle candidates (works for anon visitors under RLS). Results are
 * memoized in-module so repeat clicks/hovers never re-query.
 */

import { supabase } from "@/integrations/supabase/client";
import { findArtistBySlug } from "@/data/artistRoster";
import { getProfileHandleCandidates, normalizeProfileSlugInput } from "@/lib/profileSlug";

/** Tiny in-memory cache: normalized handle → resolved destination promise. */
const destinationCache = new Map<string, Promise<string>>();

/**
 * Static tiers (3 → 5). Pure/synchronous — also used as the safety net when
 * the network is unavailable, so the card always lands somewhere real.
 *
 * Every ARTIST_ROSTER entry has a mounted editorial site at `/<slug>-site`:
 * App.tsx maps the roster into <Route>s (arya-xo keeps its bespoke wrapper),
 * all rendered by the shared ArtistSiteTemplate.
 */
function resolveRosterDestination(handle: string): string {
  const artist = findArtistBySlug(handle);
  if (artist) return `/${artist.slug}-site`;
  return "/roster";
}

async function resolveUncached(handle: string): Promise<string> {
  // Tiers 1–2: DB-backed (profiles → creator_spaces). Any failure falls
  // through to the static roster tiers.
  try {
    const candidates = getProfileHandleCandidates(handle);
    const results = await Promise.all(
      candidates.map((candidate) =>
        (supabase as any)
          .rpc("get_public_profile_by_username", { _username: candidate })
          .maybeSingle(),
      ),
    );
    const profile = results.find((r: any) => r?.data)?.data as
      | { user_id: string; username: string | null }
      | undefined;

    if (profile?.user_id) {
      const { data: space } = await supabase
        .from("creator_spaces")
        .select("creator_id")
        .eq("creator_id", profile.user_id)
        .maybeSingle();
      if (space) return `/community/${profile.user_id}`;
      if (profile.username) return `/@${profile.username}`;
    }
  } catch {
    // Network/RLS hiccup — never dead-end; use the static tiers below.
  }
  return resolveRosterDestination(handle);
}

/**
 * Resolve the best destination for a creator handle (roster slug or username).
 * Never rejects and never returns a 404-able path.
 */
export function resolveCreatorDestination(handle: string): Promise<string> {
  const key = normalizeProfileSlugInput(handle).toLowerCase();
  if (!key) return Promise.resolve("/roster");

  const cached = destinationCache.get(key);
  if (cached) return cached;

  const pending = resolveUncached(key).catch(() => resolveRosterDestination(key));
  destinationCache.set(key, pending);
  return pending;
}
