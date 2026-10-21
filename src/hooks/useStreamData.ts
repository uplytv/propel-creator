import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { MUX_LIVE_STREAM_COLUMNS } from "@/lib/safeColumns";

export interface StreamData {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  user_id: string;
  mux_playback_id?: string;
  mux_asset_id?: string;
  stream_type?: string;
  is_public?: boolean;
  viewer_count?: number;
  featured_product_id?: string;
  category?: string;
  duration?: number;
  [key: string]: any;
}

export interface ProfileData {
  display_name?: string;
  avatar_url?: string;
  tier?: number;
  tier_name?: string;
  username?: string;
}

export function useStreamData(id: string | undefined) {
  const { user } = useAuth();
  const [dbStream, setDbStream] = useState<StreamData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRealStream, setIsRealStream] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState<any>(null);
  const [memberAccess, setMemberAccess] = useState<boolean | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const contentType = searchParams.get('type');
  const routeUsername = useParams<{ username: string }>().username;
  const isFromCreatorRoute = !!routeUsername;
  const isVod = contentType === 'vod' || contentType === 'recording' || isFromCreatorRoute;

  // Fetch stream data
  useEffect(() => {
    const fetchStream = async () => {
      if (!id) return;

      const fetchProfile = async (userId: string) => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, tier, tier_name, username')
          .eq('user_id', userId)
          .single();
        if (data) setProfile(data);
      };

      const fetchFeaturedProduct = async (productId: string) => {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        if (data) setFeaturedProduct(data);
      };

      // Recording or creator route
      if (contentType === 'recording' || (isFromCreatorRoute && !contentType)) {
        const { data: rec } = await supabase.from('stream_recordings').select('*').eq('id', id).single();
        if (rec) {
          setDbStream({ ...rec, mux_playback_id: rec.playback_id, user_id: rec.creator_id } as any);
          setIsRealStream(true);
          await fetchProfile(rec.creator_id);
          setLoading(false);
          return;
        }

        if (isFromCreatorRoute) {
          const { data: asset } = await supabase.from('mux_assets').select('*').eq('id', id).single();
          if (asset) {
            setDbStream(asset as any); setIsRealStream(true);
            await fetchProfile(asset.user_id);
            setLoading(false);
            return;
          }
          const { data: muxStream } = await supabase.from('mux_live_streams').select(MUX_LIVE_STREAM_COLUMNS).eq('id', id).single();
          if (muxStream) {
            setDbStream(muxStream as any); setIsRealStream(true);
            await fetchProfile(muxStream.user_id);
            if ((muxStream as any).featured_product_id) await fetchFeaturedProduct((muxStream as any).featured_product_id);
          }
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      if (contentType === 'vod') {
        const { data: asset } = await supabase.from('mux_assets').select('*').eq('id', id).single();
        if (asset) {
          setDbStream(asset as any); setIsRealStream(true);
          await fetchProfile(asset.user_id);
        }
      } else {
        const { data: muxStream } = await supabase.from('mux_live_streams').select(MUX_LIVE_STREAM_COLUMNS).eq('id', id).single();
        if (muxStream) {
          setDbStream(muxStream as any); setIsRealStream(true);
          await fetchProfile(muxStream.user_id);
          if ((muxStream as any).featured_product_id) await fetchFeaturedProduct((muxStream as any).featured_product_id);
        }
      }
      setLoading(false);
    };

    fetchStream();
  }, [id, isVod]);

  // Realtime updates
  useEffect(() => {
    if (!isRealStream || !id) return;
    const channel = supabase
      .channel(`stream-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mux_live_streams', filter: `id=eq.${id}` },
        async (payload: any) => {
          setDbStream((prev: any) => ({ ...prev, ...payload.new }));
          const newProductId = payload.new.featured_product_id;
          const oldProductId = payload.old?.featured_product_id;
          if (newProductId !== oldProductId) {
            if (newProductId) {
              const { data: prod } = await supabase.from('products').select('*').eq('id', newProductId).single();
              setFeaturedProduct(prod || null);
            } else {
              setFeaturedProduct(null);
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, isRealStream]);

  // Presence-based viewer count
  useEffect(() => {
    if (!isRealStream || !id || isVod) return;
    const presenceChannel = supabase.channel(`viewers-${id}`, {
      config: { presence: { key: user?.id || crypto.randomUUID() } },
    });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(presenceChannel.presenceState()).length;
        setDbStream((prev: any) => prev ? { ...prev, viewer_count: count } : prev);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ joined_at: new Date().toISOString() });
      });
    return () => { presenceChannel.untrack(); supabase.removeChannel(presenceChannel); };
  }, [id, isRealStream, isVod, user?.id]);

  // Membership check
  useEffect(() => {
    if (!dbStream || dbStream.is_public !== false || !isRealStream) { setMemberAccess(true); return; }
    if (user?.id === dbStream.user_id) { setMemberAccess(true); return; }
    if (!user) { setMemberAccess(false); return; }
    supabase
      .from('member_subscriptions')
      .select('id')
      .eq('member_id', user.id)
      .eq('creator_id', dbStream.user_id)
      .eq('status', 'active')
      .limit(1)
      .single()
      .then(({ data }) => setMemberAccess(!!data));
  }, [dbStream, user, isRealStream]);

  return {
    dbStream, setDbStream,
    profile, loading, isRealStream,
    featuredProduct, setFeaturedProduct,
    memberAccess, isVod, contentType,
  };
}
