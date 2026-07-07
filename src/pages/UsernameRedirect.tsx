import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SocialCreatorPage from "@/components/creatorprofile/social/SocialCreatorPage";
import { getProfileHandleCandidates } from "@/lib/profileSlug";
import { resolveCreatorDestination } from "@/lib/resolveCreatorDestination";

/**
 * Resolves /:username (and /:username/page) to the canonical /@<slug> social
 * creator page.
 *
 * If the profile has a vanity_slug on artist_profiles, that wins; otherwise we
 * use the username itself. When NO profile exists we never render a 404 —
 * the handle runs the standard destination chain (community → profile →
 * curated artist site → artist blog → /roster) and redirects to the first
 * tier that exists.
 */
export default function UsernameRedirect() {
  const { username } = useParams<{ username: string }>();
  const [target, setTarget] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!username) {
        setTarget("/roster");
        return;
      }
      const candidates = getProfileHandleCandidates(username);
      const results = await Promise.all(
        candidates.map((candidate) =>
          supabase
            .rpc("get_public_profile_by_username", { _username: candidate })
            .maybeSingle()
        )
      );
      const profile = results.find(({ data }) => data)?.data;

      if (!profile) {
        // No profiles row — fall through the never-404 chain (roster site,
        // roster blog, /roster) instead of a "Not found" dead end.
        const dest = await resolveCreatorDestination(username);
        if (!cancelled) setTarget(dest);
        return;
      }

      const { data: artist } = await supabase
        .from("artist_profiles")
        .select("vanity_slug")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      const slug = artist?.vanity_slug || profile.username;
      if (!cancelled) setTarget(`/@${slug}`);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (username?.startsWith("@")) {
    return <SocialCreatorPage />;
  }

  if (target === undefined) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  return <Navigate to={target} replace />;
}
