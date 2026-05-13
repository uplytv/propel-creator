import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ArtistPageContent from '../components/ArtistPage/ArtistPageContent';
import CreatorLandingRenderer from '@/components/creatorprofile/CreatorLandingRenderer';
import { usePageMeta } from '../components/ArtistPage/usePageMeta';

const sb = supabase as unknown as any;

export default function PublicArtistPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-artist-page', slug],
    enabled: !!slug,
    queryFn: async () => {
      // Try artist_profiles first (musicians with a custom landing page)
      const { data: profile } = await sb
        .from('artist_profiles')
        .select('*')
        .eq('vanity_slug', slug)
        .maybeSingle();

      if (profile) {
        const { data: basic } = await sb
          .from('profiles')
          .select('id,user_id,username,display_name,avatar_url,creator_type')
          .eq('user_id', profile.user_id)
          .maybeSingle();
        return { profile, basic };
      }

      // No artist_profiles row → fall back to plain profile by username
      const { data: basic } = await sb
        .from('profiles')
        .select('id,user_id,username,display_name,avatar_url,creator_type')
        .eq('username', slug)
        .maybeSingle();
      return { profile: null, basic };
    },
  });

  const profile = data?.profile;
  const basic = data?.basic;
  const displayName = basic?.display_name || basic?.username || 'Artist';
  const theme = (profile?.page_theme || {}) as Record<string, any>;

  // SEO
  const title = profile?.seo_title || `${displayName} | UPLY`;
  const desc = profile?.seo_description || profile?.tagline || `Music, shows, and more from ${displayName}`;
  const ogImage = profile?.seo_og_image || profile?.hero_image_url || profile?.hero_logo_url || null;
  const social = (profile?.social_links || {}) as Record<string, string>;
  const sameAs = Object.values(social).filter(Boolean);
  const jsonLd = profile && profile.page_published
    ? { '@context': 'https://schema.org', '@type': 'MusicGroup', name: displayName, image: ogImage || undefined, sameAs }
    : null;
  usePageMeta({ title, description: desc, ogImage, jsonLd });

  if (isLoading) {
    return <div style={{ minHeight: '100vh', background: '#0A0E27' }} />;
  }

  if (!basic && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white px-6 text-center" style={{ background: '#0A0E27' }}>
        <h1 className="text-4xl font-bold mb-4">Not found</h1>
        <p className="opacity-70 mb-8">No creator with the handle <span className="font-mono">@{slug}</span></p>
        <Link to="/music/search" className="px-6 py-3 rounded-full font-semibold border border-white/30 hover:bg-white/10 transition">
          Search creators
        </Link>
      </div>
    );
  }

  // Musician with custom artist page that hasn't been published yet
  if (profile && !profile.page_published) {
    const bg = theme.background_color || '#0A0E27';
    const text = theme.text_color || '#FFFFFF';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg, color: text }}>
        <h1 className="text-4xl font-bold mb-4">{displayName}</h1>
        <p className="opacity-70 text-lg">Coming soon</p>
      </div>
    );
  }

  // Musicians with a published artist_profiles row keep pixel-identical layout.
  // Use ArtistPageContent directly to avoid any wrapper differences.
  if (profile && (basic?.creator_type === 'musician' || !basic?.creator_type)) {
    return <ArtistPageContent userId={profile.user_id} profile={profile} basicProfile={basic} mode="public" />;
  }

  // All other creator types → delegate to renderer.
  if (basic) {
    return (
      <CreatorLandingRenderer
        creatorType={basic.creator_type}
        basicProfile={basic}
        artistProfile={profile}
        mode="public"
      />
    );
  }

  return null;
}

