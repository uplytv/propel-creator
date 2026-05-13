import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LinkInBioRenderer from "@/components/pages/LinkInBioRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import { useEffect } from "react";

export default function BioPage() {
  const { username } = useParams<{ username: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["bio-profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, username, user_id").eq("username", username!).single();
      return data;
    },
    enabled: !!username,
  });

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["bio-page-public", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("creator_pages").select("*").eq("creator_id", profile!.id).eq("page_type", "link_in_bio").eq("is_published", true).single();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["bio-links-public", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bio_links").select("*").eq("creator_id", profile!.id).eq("is_active", true).order("position");
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Track view
  useEffect(() => {
    if (page?.id) {
      supabase.from("creator_pages").update({ view_count: (page.view_count || 0) + 1 }).eq("id", page.id).then(() => {});
    }
  }, [page?.id]);

  if (profileLoading || pageLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Skeleton className="w-16 h-16 rounded-full" /></div>;
  }

  if (!profile || !page) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Page not found</div>;
  }

  const content = (page.content || {}) as any;

  return (
    <>
      <SEOHead title={`${profile.display_name} | UPLY`} description={content.tagline || `${profile.display_name}'s link page`} />
      <LinkInBioRenderer
        displayName={profile.display_name || ""}
        avatarUrl={profile.avatar_url || ""}
        tagline={content.tagline || ""}
        bgColor={content.bgColor || "#0A0A0A"}
        accentColor={content.accentColor || "#00FF85"}
        links={links}
      />
    </>
  );
}
