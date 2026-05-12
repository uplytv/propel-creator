import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import ArtistPageContent from '../components/ArtistPage/ArtistPageContent';

const sb = supabase as unknown as any;

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const userId = id;
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['artist-profile-full', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb.from('artist_profiles').select('*').eq('user_id', userId).maybeSingle();
      return data;
    },
  });
  const { data: basic } = useQuery({
    queryKey: ['music', 'artist-basic', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb.from('profiles').select('id,username,display_name,avatar_url').eq('id', userId).maybeSingle();
      return data;
    },
  });

  if (!userId) return null;
  const isOwner = !!user && user.id === userId;

  return (
    <div className="pb-32 relative">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mt-3 px-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>

      {isOwner && profile && !profile.page_published && (
        <div className="mx-4 mt-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,200,0,0.10)', border: '1px solid rgba(255,200,0,0.25)' }}>
          Your page is unpublished. Toggle Publish in the editor to make it live{profile.vanity_slug ? ` at uply.tv/@${profile.vanity_slug}` : ''}.
        </div>
      )}

      <ArtistPageContent
        userId={userId}
        profile={profile ?? { page_theme: {}, social_links: {}, section_order: ['hero', 'social', 'music', 'shows', 'remixes', 'djsets', 'about'], section_visibility: {} }}
        basicProfile={basic}
        mode="app"
      />

      {isOwner && (
        <Link
          to={`/music/artist/${userId}/edit`}
          className="fixed bottom-24 right-6 z-40 px-5 py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg"
          style={{ background: 'linear-gradient(90deg, #3D7CFF, #B025FF)', color: '#fff' }}
        >
          <Pencil className="w-4 h-4" /> Edit page
        </Link>
      )}
    </div>
  );
}
