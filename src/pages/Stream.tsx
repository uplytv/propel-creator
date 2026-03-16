import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Heart, Share2, Shield, TrendingUp, Zap, Crown, Radio, Coins, Loader2, ShoppingBag, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import StreamChat from "@/components/live/StreamChat";
import JoinOverlay from "@/components/live/JoinOverlay";
import TipButton from "@/components/live/TipButton";
import TipOverlay from "@/components/live/TipOverlay";
import MobileChatDrawer from "@/components/live/MobileChatDrawer";
import ViewerEngagementOverlay from "@/components/live/ViewerEngagementOverlay";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UPLYMuxPlayer from "@/components/MuxPlayer";
import WebRTCPlayer from "@/components/live/WebRTCPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "@/components/FollowButton";
import ClipCreator from "@/components/clips/ClipCreator";
import SharePanel from "@/components/share/SharePanel";

const tierIcons = [Shield, TrendingUp, Zap, Crown];
const tierColors: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-primary/10 text-primary",
  3: "bg-primary/15 text-primary",
  4: "bg-warning/10 text-warning",
};

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}

export default function Stream() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [joinOpen, setJoinOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(100);
  const [dbStream, setDbStream] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRealStream, setIsRealStream] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const contentType = searchParams.get('type'); // 'vod' | 'recording' | null
  const isVod = contentType === 'vod' || contentType === 'recording';

  useEffect(() => {
    const fetchStream = async () => {
      if (!id) return;

      if (contentType === 'recording') {
        // Fetch stream recording
        const { data: rec } = await supabase
          .from('stream_recordings')
          .select('*')
          .eq('id', id)
          .single();

        if (rec) {
          setDbStream({
            ...rec,
            mux_playback_id: rec.playback_id,
            user_id: rec.creator_id,
          });
          setIsRealStream(true);

          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, tier, tier_name')
            .eq('user_id', rec.creator_id)
            .single();
          setProfile(prof);
        }
        setLoading(false);
        return;
      }

      if (contentType === 'vod') {
        // Fetch VOD asset
        const { data: asset } = await supabase
          .from('mux_assets')
          .select('*')
          .eq('id', id)
          .single();

        if (asset) {
          setDbStream(asset);
          setIsRealStream(true);

          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, tier, tier_name')
            .eq('user_id', asset.user_id)
            .single();
          setProfile(prof);
        }
      } else {
        // Try fetching from mux_live_streams first
        const { data: muxStream } = await supabase
          .from('mux_live_streams')
          .select('*')
          .eq('id', id)
          .single();

        if (muxStream) {
          setDbStream(muxStream);
          setIsRealStream(true);

          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, tier, tier_name')
            .eq('user_id', muxStream.user_id)
            .single();
          setProfile(prof);

          // Fetch featured product if set
          if ((muxStream as any).featured_product_id) {
            const { data: prod } = await supabase
              .from('products')
              .select('*')
              .eq('id', (muxStream as any).featured_product_id)
              .single();
            if (prod) setFeaturedProduct(prod);
          }
        }
      }
      setLoading(false);
    };

    fetchStream();
  }, [id, isVod]);

  // Realtime status updates + featured product changes
  useEffect(() => {
    if (!isRealStream || !id) return;

    const channel = supabase
      .channel(`stream-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mux_live_streams',
        filter: `id=eq.${id}`,
      }, async (payload: any) => {
        setDbStream((prev: any) => ({ ...prev, ...payload.new }));
        
        // Reactively update featured product when it changes
        const newProductId = payload.new.featured_product_id;
        const oldProductId = payload.old?.featured_product_id;
        if (newProductId !== oldProductId) {
          if (newProductId) {
            const { data: prod } = await supabase
              .from('products')
              .select('*')
              .eq('id', newProductId)
              .single();
            setFeaturedProduct(prod || null);
          } else {
            setFeaturedProduct(null);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, isRealStream]);

  // Real-time viewer count via presence
  useEffect(() => {
    if (!isRealStream || !id || isVod) return;

    const presenceChannel = supabase.channel(`viewers-${id}`, {
      config: { presence: { key: user?.id || crypto.randomUUID() } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setDbStream((prev: any) => prev ? { ...prev, viewer_count: count } : prev);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ joined_at: new Date().toISOString() });
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [id, isRealStream, isVod, user?.id]);

  const handleTip = useCallback((amount: number, message: string) => {
    setCreditsBalance((prev) => Math.max(0, prev - amount));
    toast({
      title: `Tip sent! 🎉`,
      description: `You tipped ${amount} credits`,
    });
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl h-14" />
        <div className="flex-1 pt-14">
          <Skeleton className="w-full aspect-video" />
          <div className="px-6 py-5">
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // If it's a real stream or VOD from the database
  if (isRealStream && dbStream) {
    const isActive = !isVod && dbStream.status === 'active';
    const creatorName = profile?.display_name || 'Creator';
    const creatorAvatar = profile?.display_name?.slice(0, 2).toUpperCase() || 'CR';
    const creatorTier = profile?.tier || 1;
    const creatorTierName = profile?.tier_name || 'Starter';
    const TierIcon = tierIcons[creatorTier - 1] || Shield;
    const playbackId = dbStream.mux_playback_id;

    // Guard: no playback ID available
    if (!playbackId) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Stream unavailable</h1>
            <p className="text-sm text-muted-foreground mb-4">The creator may have ended their session.</p>
            <Button variant="outline" onClick={() => navigate("/live")}>Browse Streams</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-14 px-3 sm:px-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2">
              {isVod ? (
                <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted">Recording</span>
              ) : isActive ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  LIVE
                </div>
              ) : (
                <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted">Offline</span>
              )}
              {!isVod && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {formatViewers(dbStream.viewer_count || 0)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {user && (
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-warning/10 text-xs">
                  <Coins className="w-3.5 h-3.5 text-warning" />
                  <span className="font-semibold text-warning">{creditsBalance}</span>
                </div>
              )}
              <TipButton
                creatorName={creatorName}
                creditsBalance={creditsBalance}
                isLoggedIn={!!user}
                onTip={handleTip}
              />
              <button
                onClick={() => setLiked(!liked)}
                className={`p-2 rounded-lg transition-colors ${liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              </button>
              {isVod && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex pt-14">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Video player with engagement overlay */}
            <div className="relative">
              {isVod && !playbackId ? (
                <div className="w-full aspect-video bg-muted/50 flex items-center justify-center border-b border-border">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                    <h2 className="text-lg font-bold text-foreground mb-1">Still processing</h2>
                    <p className="text-sm text-muted-foreground">This recording is being prepared. Check back shortly.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(-1)}>
                      Go Back
                    </Button>
                  </div>
                </div>
              ) : (isVod && playbackId) ? (
                <UPLYMuxPlayer
                  playbackId={playbackId}
                  title={dbStream.title || 'Recording'}
                  autoPlay
                  muted={false}
                  streamType="on-demand"
                />
              ) : isActive && dbStream.stream_type === 'browser' ? (
                <WebRTCPlayer
                  streamId={dbStream.id}
                  title={dbStream.title || 'Live Stream'}
                />
              ) : isActive && playbackId ? (
                <UPLYMuxPlayer
                  playbackId={playbackId}
                  title={dbStream.title || 'Live Stream'}
                  autoPlay
                  muted
                  streamType="ll-live"
                />
              ) : (
                <div className="w-full aspect-video bg-muted/50 flex items-center justify-center border-b border-border">
                  <div className="text-center">
                    <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-foreground mb-1">
                      {dbStream.status === 'idle' ? "Stream hasn't started yet" : "Stream has ended"}
                    </h2>
                    <p className="text-sm text-muted-foreground">Check back soon or browse other live streams.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/live")}>
                      Browse Streams
                    </Button>
                  </div>
                </div>
              )}

              {/* Viewer Engagement Overlay — only on active live streams */}
              {isActive && id && (
                <ViewerEngagementOverlay
                  streamId={id}
                  streamTitle={dbStream.title || 'Live Stream'}
                  creatorUserId={dbStream.user_id}
                />
              )}
            </div>

            {/* Stream info */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h1 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">{dbStream.title || 'Untitled Stream'}</h1>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {creatorAvatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{creatorName}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tierColors[creatorTier]}`}>
                        <TierIcon className="w-2.5 h-2.5" />
                        {creatorTierName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dbStream.category || 'General'}</p>
                  </div>
                </div>
                <FollowButton targetUserId={dbStream.user_id} />
              </div>
              {dbStream.description && (
                <p className="text-sm text-muted-foreground mt-3 hidden sm:block">{dbStream.description}</p>
              )}

              {/* Featured Product */}
              {featuredProduct && (
                <button
                  onClick={() => navigate(`/community/${dbStream.user_id}`, { state: { tab: featuredProduct.type === 'course' ? 'classroom' : 'community' } })}
                  className="mt-4 w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group"
                >
                  {featuredProduct.image_url ? (
                    <img src={featuredProduct.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl">
                      {featuredProduct.type === 'course' ? '📚' : featuredProduct.type === 'community' ? '🤝' : featuredProduct.type === 'coaching' ? '🎯' : '📦'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <ShoppingBag className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Featured</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{featuredProduct.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{featuredProduct.type} · <span className="text-primary font-semibold">${featuredProduct.price}</span></p>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                      {featuredProduct.type === 'course' ? 'Enroll' : featuredProduct.type === 'coaching' ? 'Book' : 'Buy Now'}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">${featuredProduct.price}</span>
                  </div>
                </button>
              )}

              {/* Clip Creator — VOD only */}
              {isVod && playbackId && dbStream.mux_asset_id && (
                <div className="mt-4">
                  <ClipCreator
                    sourceAssetId={dbStream.mux_asset_id}
                    creatorId={dbStream.user_id}
                    duration={dbStream.duration || 300}
                    playbackId={playbackId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Chat sidebar - desktop only */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="fixed top-14 right-0 w-80 bottom-0">
              <StreamChat
                streamId={id}
                creatorUserId={dbStream.user_id}
                isLoggedIn={!!user}
                onTipClick={() => setTipOpen(true)}
                creditsBalance={creditsBalance}
              />
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <MobileChatDrawer
            streamId={id}
            creatorUserId={dbStream.user_id}
            isLoggedIn={!!user}
            onTipClick={() => setTipOpen(true)}
            creditsBalance={creditsBalance}
          />
        </div>

        {isVod && (
          <SharePanel
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            contentType={contentType === 'recording' ? 'recording' : 'clip'}
            contentId={id || ''}
            title={dbStream.title || 'Recording'}
            playbackId={dbStream.mux_playback_id}
            muxAssetId={dbStream.mux_asset_id}
            creatorUsername={profile?.display_name}
          />
        )}
      </div>
    );
  }

  // No mock fallback — only real data
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">Stream not found</h1>
        <p className="text-muted-foreground mb-4">This stream may have ended or doesn't exist.</p>
        <Button variant="outline" onClick={() => navigate("/live")}>Browse Streams</Button>
      </div>
    </div>
  );
}
