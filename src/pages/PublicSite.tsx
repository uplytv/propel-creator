// Public view of a creator's published Website (page_type = 'website').
// Route (wire in App.tsx, immediately BEFORE the /:username/page catch-all):
//   <Route path="/:username/site" element={<PublicSite />} />
import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import SiteRenderer from "@/components/sitebuilder/SiteRenderer";
import { DEFAULT_THEME, type SiteSection, type SiteTheme } from "@/components/sitebuilder/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicSite() {
  const { username } = useParams<{ username: string }>();
  const handle = (username || "").replace(/^@/, "");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-site-profile", handle],
    enabled: !!handle,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url, username")
        .eq("username", handle)
        .maybeSingle();
      return data;
    },
  });

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["public-site-page", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_pages")
        .select("*")
        .eq("creator_id", profile!.id)
        .eq("page_type", "website")
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
  });

  // Best-effort view tracking.
  useEffect(() => {
    if (page?.id) {
      supabase
        .from("creator_pages")
        .update({ view_count: (page.view_count || 0) + 1 })
        .eq("id", page.id)
        .then(() => {});
    }
  }, [page?.id]);

  if (profileLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center gap-4 pt-24 px-6">
        <Skeleton className="w-24 h-24 rounded-none" />
        <Skeleton className="w-64 h-8 rounded-none" />
        <Skeleton className="w-80 h-4 rounded-none" />
      </div>
    );
  }

  if (!profile || !page) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-muted-foreground">This website isn't available.</p>
        <Link to="/" className="text-sm text-primary hover:underline">Go to UPLY →</Link>
      </div>
    );
  }

  const content = (page.content || {}) as { sections?: SiteSection[]; theme?: SiteTheme };
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const theme = { ...DEFAULT_THEME, ...(content.theme || {}) };

  return (
    <>
      <SEOHead
        title={page.seo_title || `${profile.display_name || profile.username} | UPLY`}
        description={page.seo_description || `${profile.display_name || profile.username}'s website on UPLY`}
      />
      <div className="min-h-screen">
        <SiteRenderer
          sections={sections}
          theme={theme}
          productsUserId={profile.user_id}
          displayName={profile.display_name || undefined}
          avatarUrl={profile.avatar_url || undefined}
        />
      </div>
    </>
  );
}
