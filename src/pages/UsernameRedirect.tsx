import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SocialCreatorPage from "@/components/creatorprofile/social/SocialCreatorPage";
import { getProfileHandleCandidates } from "@/lib/profileSlug";
import { resolveCreatorDestination } from "@/lib/resolveCreatorDestination";
import BusinessSitePage from "./BusinessSitePage";
import CreatorTenantPage from "./CreatorTenantPage";

/**
 * Resolves /:username (and /:username/page) to the canonical /@<slug> social
 * creator page, or renders the tenant page (business or creator tenant)
 * when the profile is a seeded/claimable tenant.
 */
export default function UsernameRedirect() {
  const { username } = useParams<{ username: string }>();
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [tenantProfile, setTenantProfile] = useState<{
    id: string;
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio?: string | null;
    account_type: string;
    business_status: string | null;
  } | null>(null);

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
      const profile = results.find(({ data }) => data)?.data as {
        id: string;
        user_id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        account_type?: string | null;
        business_status?: string | null;
      } | undefined;

      if (!profile) {
        const dest = await resolveCreatorDestination(username);
        if (!cancelled) setTarget(dest);
        return;
      }

      const isTenant =
        profile.account_type === "business" ||
        (profile.account_type === "creator" && !!profile.business_status);

      if (isTenant) {
        if (!cancelled) {
          setTenantProfile({
            id: profile.id,
            user_id: profile.user_id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            bio: (profile as { bio?: string | null }).bio ?? null,
            account_type: profile.account_type ?? "business",
            business_status: profile.business_status ?? "draft",
          });
        }
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

  if (tenantProfile) {
    return tenantProfile.account_type === "creator" ? (
      <CreatorTenantPage profile={tenantProfile} />
    ) : (
      <BusinessSitePage profile={tenantProfile} />
    );
  }

  if (target === undefined) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  return <Navigate to={target} replace />;
}
