import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { getProfileHandleCandidates } from "@/lib/profileSlug";

/**
 * Resolves the safest possible "view my profile" URL for the current user.
 *
 * Prefers, in order: artist vanity slug → claimed username → derived handle
 * from display name. If no slug-like handle exists we fall back to
 * `/dashboard` (signed in) or `/auth` (signed out) — never `/@<uuid>`, which
 * SocialCreatorPage cannot resolve and produces a 404 dead-end.
 *
 * Used by AppLayout's profile shortcut and the branded 404 CTA so both share
 * one source of truth.
 */
export function usePublicProfileInfo(): { path: string; handle: string | null } {
  const { user } = useAuth();
  const { profile } = useApp();

  const { data: vanitySlug } = useQuery({
    queryKey: ["nav-vanity-slug", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("artist_profiles" as any)
        .select("vanity_slug")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as any)?.vanity_slug as string | null;
    },
    enabled: !!user,
  });

  if (!user) return { path: "/auth", handle: null };

  const handle =
    vanitySlug ||
    profile.username ||
    getProfileHandleCandidates(profile.name)[0] ||
    null;

  return { path: handle ? `/@${handle}` : "/dashboard", handle };
}

export function usePublicProfilePath(): string {
  return usePublicProfileInfo().path;
}
