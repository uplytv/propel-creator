import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ArtistPageContent from '../components/ArtistPage/ArtistPageContent';
import { usePageMeta } from '../components/ArtistPage/usePageMeta';

const sb = supabase as unknown as any;

export default function PublicArtistPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-artist-page', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: profile } = await sb.from('artist_profiles').select('*').eq('vanity_slug', slug).maybeSingle();
      if (!profile) return { profile: null, basic: null };
      const { data: basic } = await sb.from('profiles').select('id,username,display_name,avatar_url').eq('id', profile.user_id).maybeSingle();
      return { profile, basic };
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

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white px-6 text-center" style={{ background: '#0A0E27' }}>
        <h1 className="text-4xl font-bold mb-4">Artist not found</h1>
        <p className="opacity-70 mb-8">No artist with the handle <span className="font-mono">@{slug}</span></p>
        <Link to="/music/search" className="px-6 py-3 rounded-full font-semibold border border-white/30 hover:bg-white/10 transition">
          Search artists
        </Link>
      </div>
    );
  }

  if (!profile.page_published) {
    const bg = theme.background_color || '#0A0E27';
    const text = theme.text_color || '#FFFFFF';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg, color: text }}>
        <h1 className="text-4xl font-bold mb-4">{displayName}</h1>
        <p className="opacity-70 text-lg">Coming soon</p>
      </div>
    );
  }

  return <ArtistPageContent userId={profile.user_id} profile={profile} basicProfile={basic} mode="public" />;
}
