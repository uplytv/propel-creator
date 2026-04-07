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
import ViewerShopOverlay from "@/components/live/ViewerShopOverlay";
import FeaturedProductCTA from "@/components/live/FeaturedProductCTA";
import ViewerRewardsBadge from "@/components/live/ViewerRewardsBadge";
import StreamAlerts from "@/components/live/StreamAlerts";
import LiveCaptionsOverlay from "@/components/live/LiveCaptionsOverlay";
import RaidOverlay from "@/components/live/RaidOverlay";
import DonationGoalOverlay from "@/components/live/DonationGoalOverlay";
import { useViewerRewards } from "@/hooks/useViewerRewards";
import { useLiveCaptions } from "@/hooks/useLiveCaptions";
import { useRaidSystem } from "@/hooks/useRaidSystem";
import { useStreamPredictions } from "@/hooks/useStreamPredictions";
import { useGiftSubscription } from "@/hooks/useGiftSubscription";
import { useLiveQuiz } from "@/hooks/useLiveQuiz";
import { useViewerSentiment } from "@/hooks/useViewerSentiment";
import StreamPredictionOverlay from "@/components/live/StreamPredictionOverlay";
import { LiveQuizOverlay } from "@/components/live/LiveQuizOverlay";
import ViewerSentimentOverlay from "@/components/live/ViewerSentimentOverlay";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UPLYMuxPlayer from "@/components/MuxPlayer";
import WebRTCPlayer from "@/components/live/WebRTCPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "@/components/FollowButton";
import ClipCreator from "@/components/clips/ClipCreator";
import SharePanel from "@/components/share/SharePanel";
import SEOHead from "@/components/SEOHead";
import RecentRecordingsRow from "@/components/live/RecentRecordingsRow";

function StreamEndedState({ streamId, status, creatorId, creatorName, creatorAvatar, creatorUsername }: { streamId: string; status: string; creatorId: string; creatorName?: string; creatorAvatar?: string; creatorUsername?: string | null }) {
  const navigate = useNavigate();
  const [recordingTarget, setRecordingTarget] = useState<{ id: string; slug: string | null } | null>(null);
  const [resolvedCreatorUsername, setResolvedCreatorUsername] = useState<string | null>(creatorUsername || null);
  const [checking, setChecking] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const checkVod = async () => {
      const [{ data: session }, { data: prof }] = await Promise.all([
        streamId
          ? supabase
              .from('live_stream_sessions')
              .select('mux_asset_id')
              .eq('stream_id', streamId)
              .not('mux_asset_id', 'is', null)
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        creatorUsername
          ? Promise.resolve({ data: { username: creatorUsername } })
          : supabase
              .from('profiles')
              .select('username')
              .eq('user_id', creatorId)
              .maybeSingle(),
      ]);

      if (cancelled) return;
      if (prof?.username) setResolvedCreatorUsername(prof.username);

      if (session?.mux_asset_id) {
        const { data: exactRecording } = await supabase
          .from('stream_recordings')
          .select('id, slug')
          .eq('mux_asset_id', session.mux_asset_id)
          .maybeSingle();

        if (!cancelled && exactRecording) {
          setRecordingTarget(exactRecording);
          setChecking(false);
          return;
        }
      }

      // Recording not ready yet — poll up to 6 times (30s total)
      if (!cancelled && pollCount < 6) {
        setTimeout(() => {
          if (!cancelled) setPollCount(c => c + 1);
        }, 5000);
      } else if (!cancelled) {
        setChecking(false);
      }
    };
    checkVod();
    return () => { cancelled = true; };
  }, [creatorId, creatorUsername, streamId, pollCount]);

  return (
    <div className="w-full aspect-video bg-muted/50 flex items-center justify-center border-b border-border">
      <div className="text-center px-4">
        <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1">
          {status === 'idle' ? "Stream hasn't started yet" : "Stream has ended"}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {status === 'idle'
            ? `Check back soon or browse ${creatorName ? creatorName + "'s profile" : "other live streams"}.`
            : `This stream is no longer live.${creatorName ? ` Check out ${creatorName}'s profile for more content.` : ""}`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {recordingTarget && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/stream/${recordingTarget.id}?type=recording`)}
            >
              Watch Recording
            </Button>
          )}
          {resolvedCreatorUsername && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/creator/${encodeURIComponent(resolvedCreatorUsername)}`)}>
              View Creator Profile
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("/live")}>
            Browse Streams
          </Button>
        </div>
        {checking && status !== 'idle' && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Looking for recording...</p>
          </div>
        )}
        {!checking && !recordingTarget && status !== 'idle' && (
          <p className="mt-3 text-xs text-muted-foreground">
            Recording is still processing. Check back in a few minutes.
          </p>
        )}
      </div>
    </div>
  );
}

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
  const { id, username: routeUsername, slug: routeSlug } = useParams<{ id: string; username: string; slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [memberAccess, setMemberAccess] = useState<boolean | null>(null);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(routeUsername || null);

  const searchParams = new URLSearchParams(window.location.search);
  const contentType = searchParams.get('type');
  const isFromCreatorRoute = !!routeUsername;
  const isFromSlugRoute = !!routeSlug;
  const isVod = contentType === 'vod' || contentType === 'recording' || (isFromCreatorRoute && !isFromSlugRoute);

  // Viewer features
  const viewerRewards = useViewerRewards(!!dbStream && dbStream.status === 'active' && !isVod);
  const viewerCaptions = useLiveCaptions();
  const raidSystem = useRaidSystem(id, false);
  const predictions = useStreamPredictions(id || '');
  const giftSub = useGiftSubscription(id || '', dbStream?.user_id || '');
  const liveQuiz = useLiveQuiz(id, false);
  const sentiment = useViewerSentiment(id);

  useEffect(() => {
    const fetchStream = async () => {
      // Handle slug-based route: /:username/live/:slug
      if (isFromSlugRoute && routeSlug) {
          const { data: routeProfile } = routeUsername
            ? await supabase
                .from('profiles')
                .select('user_id, display_name, avatar_url, tier, tier_name, username')
                .eq('username', decodeURIComponent(routeUsername))
                .maybeSingle()
            : { data: null };

          let streamQuery = supabase
            .from('mux_live_streams')
            .select('*')
            .eq('slug', routeSlug)
            .order('created_at', { ascending: false })
            .limit(1);

          if (routeProfile?.user_id) {
            streamQuery = streamQuery.eq('user_id', routeProfile.user_id);
          }

          const { data: muxStream } = await streamQuery.maybeSingle();

        if (muxStream) {
          setDbStream(muxStream);
          setIsRealStream(true);
            const prof = routeProfile || (await supabase
              .from('profiles')
              .select('display_name, avatar_url, tier, tier_name, username')
              .eq('user_id', muxStream.user_id)
              .single()).data;
          setProfile(prof);
          if (prof?.username) setCreatorUsername(prof.username);
          if ((muxStream as any).featured_product_id) {
            const source = (muxStream as any).featured_product_source || "digital";
            if (source === "live_shop") {
              const { data: liveProd } = await supabase
                .from('live_products')
                .select('*')
                .eq('id', (muxStream as any).featured_product_id)
                .single();
              if (liveProd) {
                setFeaturedProduct({
                  id: liveProd.id, name: (liveProd as any).title,
                  type: (liveProd as any).type === "auction" ? "auction" : "product",
                  price: (liveProd as any).type === "auction" ? ((liveProd as any).starting_bid || 0) : (liveProd as any).price,
                  description: (liveProd as any).description, image_url: (liveProd as any).image_url,
                  source: "live_shop", live_product_data: liveProd,
                });
              }
            } else {
              const { data: prod } = await supabase
                .from('products').select('*')
                .eq('id', (muxStream as any).featured_product_id).single();
              if (prod) setFeaturedProduct({ ...prod, source: "digital" });
            }
          }
        }
        setLoading(false);
        return;
      }

      if (!id) return;

      if (contentType === 'recording' || (isFromCreatorRoute && !contentType)) {
        // Try stream_recordings first
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
            .select('display_name, avatar_url, tier, tier_name, username')
            .eq('user_id', rec.creator_id)
            .single();
          setProfile(prof);
          if (prof?.username) setCreatorUsername(prof.username);
          setLoading(false);
          return;
        }

        // If accessed via creator route, also try mux_assets (VOD)
        if (isFromCreatorRoute) {
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
              .select('display_name, avatar_url, tier, tier_name, username')
              .eq('user_id', asset.user_id)
              .single();
            setProfile(prof);
            if (prof?.username) setCreatorUsername(prof.username);
            setLoading(false);
            return;
          }

          // Finally try mux_live_streams
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
              .select('display_name, avatar_url, tier, tier_name, username')
              .eq('user_id', muxStream.user_id)
              .single();
            setProfile(prof);
            if (prof?.username) setCreatorUsername(prof.username);
            if ((muxStream as any).featured_product_id) {
              const source2 = (muxStream as any).featured_product_source || "digital";
              if (source2 === "live_shop") {
                const { data: liveProd2 } = await supabase
                  .from('live_products').select('*')
                  .eq('id', (muxStream as any).featured_product_id).single();
                if (liveProd2) {
                  setFeaturedProduct({
                    id: liveProd2.id, name: (liveProd2 as any).title,
                    type: (liveProd2 as any).type === "auction" ? "auction" : "product",
                    price: (liveProd2 as any).type === "auction" ? ((liveProd2 as any).starting_bid || 0) : (liveProd2 as any).price,
                    description: (liveProd2 as any).description, image_url: (liveProd2 as any).image_url,
                    source: "live_shop", live_product_data: liveProd2,
                  });
                }
              } else {
                const { data: prod } = await supabase
                  .from('products').select('*')
                  .eq('id', (muxStream as any).featured_product_id).single();
                if (prod) setFeaturedProduct({ ...prod, source: "digital" });
              }
            }
          }
          setLoading(false);
          return;
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
            .select('display_name, avatar_url, tier, tier_name, username')
            .eq('user_id', asset.user_id)
            .single();
          setProfile(prof);
          if (prof?.username) setCreatorUsername(prof.username);
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
            .select('display_name, avatar_url, tier, tier_name, username')
            .eq('user_id', muxStream.user_id)
            .single();
          setProfile(prof);
          if (prof?.username) setCreatorUsername(prof.username);

          // Fetch featured product if set
          if ((muxStream as any).featured_product_id) {
            const source3 = (muxStream as any).featured_product_source || "digital";
            if (source3 === "live_shop") {
              const { data: liveProd3 } = await supabase
                .from('live_products').select('*')
                .eq('id', (muxStream as any).featured_product_id).single();
              if (liveProd3) {
                setFeaturedProduct({
                  id: liveProd3.id, name: (liveProd3 as any).title,
                  type: (liveProd3 as any).type === "auction" ? "auction" : "product",
                  price: (liveProd3 as any).type === "auction" ? ((liveProd3 as any).starting_bid || 0) : (liveProd3 as any).price,
                  description: (liveProd3 as any).description, image_url: (liveProd3 as any).image_url,
                  source: "live_shop", live_product_data: liveProd3,
                });
              }
            } else {
              const { data: prod } = await supabase
                .from('products').select('*')
                .eq('id', (muxStream as any).featured_product_id).single();
              if (prod) setFeaturedProduct({ ...prod, source: "digital" });
            }
          }
        }
      }
      setLoading(false);
    };

    fetchStream();
  }, [id, routeSlug, isVod]);

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
            const newSource = payload.new.featured_product_source || "digital";
            if (newSource === "live_shop") {
              const { data: liveProd } = await supabase
                .from('live_products').select('*')
                .eq('id', newProductId).single();
              if (liveProd) {
                setFeaturedProduct({
                  id: liveProd.id, name: (liveProd as any).title,
                  type: (liveProd as any).type === "auction" ? "auction" : "product",
                  price: (liveProd as any).type === "auction" ? ((liveProd as any).starting_bid || 0) : (liveProd as any).price,
                  description: (liveProd as any).description, image_url: (liveProd as any).image_url,
                  source: "live_shop", live_product_data: liveProd,
                });
              }
            } else {
              const { data: prod } = await supabase
                .from('products').select('*')
                .eq('id', newProductId).single();
              setFeaturedProduct(prod ? { ...prod, source: "digital" } : null);
            }
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

  // Check membership for private streams
  useEffect(() => {
    if (!dbStream || dbStream.is_public !== false || !isRealStream) {
      setMemberAccess(true);
      return;
    }
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

  const handleTip = useCallback((amount: number, message: string) => {
    setCreditsBalance((prev) => Math.max(0, prev - amount));
    toast.success(`Tip sent! 🎉`, { description: `You tipped ${amount} credits` });
  }, []);

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
    const isPrivateStream = dbStream.is_public === false;

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

    // Private stream: check membership
    if (isPrivateStream && user?.id !== dbStream.user_id) {
      if (memberAccess === null) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        );
      }

      if (!memberAccess) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center max-w-sm mx-4">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">Members Only</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This is a private stream for {creatorName}'s community members. Subscribe to get access.
              </p>
              <Button variant="default" onClick={() => navigate(`/creator/${dbStream.user_id}`)}>
                View Membership Options
              </Button>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead
          title={dbStream.title || (isVod ? "Recording" : "Live Stream")}
          description={dbStream.description || `Watch ${creatorName}'s ${isActive ? "live stream" : "recording"} on Uply.`}
          image={playbackId ? `https://image.mux.com/${playbackId}/thumbnail.webp?width=1200&height=630` : undefined}
          type={isActive ? "video.other" : "video.movie"}
        />
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
                creatorId={dbStream?.user_id || ""}
                creatorName={creatorName}
                streamId={id}
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
                  playbackId={playbackId || undefined}
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
              <StreamEndedState 
                  streamId={dbStream.id} 
                  status={dbStream.status} 
                  creatorId={dbStream.user_id}
                  creatorName={creatorName}
                  creatorUsername={creatorUsername || profile?.username || null}
                />
              )}

              {/* Viewer Engagement Overlay — only on active live streams */}
              {isActive && id && (
                <>
                  <ViewerEngagementOverlay
                    streamId={id}
                    streamTitle={dbStream.title || 'Live Stream'}
                    creatorUserId={dbStream.user_id}
                  />
                  <ViewerShopOverlay
                    streamId={id}
                    creatorUserId={dbStream.user_id}
                  />
                  {featuredProduct && (
                    <FeaturedProductCTA
                      product={featuredProduct}
                      streamId={id}
                      creatorId={dbStream.user_id}
                    />
                  )}
                  {/* Stream Alerts */}
                  <StreamAlerts />
                  {/* Viewer Rewards */}
                  <ViewerRewardsBadge
                    xp={viewerRewards.xp}
                    badges={viewerRewards.badges}
                    newBadge={viewerRewards.newBadge}
                    onDismiss={viewerRewards.dismissBadge}
                  />
                  {/* Live Captions */}
                  <LiveCaptionsOverlay
                    captions={viewerCaptions.captions}
                    interimText={viewerCaptions.interimText}
                    isActive={viewerCaptions.isActive}
                  />
                  {/* Raid Overlay */}
                  <RaidOverlay
                    isRaiding={false}
                    raidCountdown={null}
                    incomingRaid={raidSystem.incomingRaid}
                  />
                  {/* Donation Goal (viewer view) */}
                  <DonationGoalOverlay
                    streamId={id!}
                    isHost={false}
                    creatorId={dbStream.user_id}
                  />

                  {/* Stream Predictions (viewer view) */}
                  <StreamPredictionOverlay
                    predictions={predictions.predictions}
                    isCreator={false}
                    onPlaceBet={predictions.placeBet}
                    onResolve={predictions.resolvePrediction}
                    userBets={predictions.userBets}
                  />

                   {/* Gift Subscription Button */}
                   {user && user.id !== dbStream.user_id && (
                     <div className="absolute bottom-16 left-3 z-20">
                       <button
                         onClick={() => giftSub.giftRandomSubscription(1)}
                         disabled={giftSub.gifting}
                         className="px-3 py-1.5 rounded-full text-[10px] font-semibold text-white backdrop-blur-md"
                         style={{ backgroundColor: 'rgba(168,85,247,0.6)' }}
                       >
                         🎁 Gift Sub
                       </button>
                     </div>
                   )}

                   {/* Live Quiz (viewer view) */}
                   <div className="absolute bottom-32 right-3 z-20 w-64">
                     <LiveQuizOverlay quiz={liveQuiz.quiz} isCreator={false} onSubmitAnswer={liveQuiz.submitAnswer} />
                   </div>

                   {/* Viewer Sentiment */}
                   <div className="absolute top-20 left-3 z-20 w-44">
                     <ViewerSentimentOverlay sentiment={sentiment} />
                   </div>
                </>
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

              {/* Featured Product CTA — interactive */}
              {featuredProduct && !isVod && isActive && (
                <div className="mt-4">
                  <FeaturedProductCTA
                    product={featuredProduct}
                    streamId={id || ""}
                    creatorId={dbStream.user_id}
                  />
                </div>
              )}
              {featuredProduct && (isVod || !isActive) && (
                <div className="mt-4">
                  <FeaturedProductCTA
                    product={featuredProduct}
                    streamId={dbStream.id}
                    creatorId={dbStream.user_id}
                  />
                </div>
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

            {/* Related recordings when stream is offline */}
            {!isActive && !isVod && dbStream.user_id && (
              <div className="px-4 sm:px-6 py-5">
                <h3 className="text-sm font-bold text-foreground mb-3">More from this creator</h3>
                <RecentRecordingsRow creatorId={dbStream.user_id} />
              </div>
            )}
          </div>

          {/* Chat sidebar - desktop only — hide when offline */}
          {(isActive || isVod) && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="fixed top-14 right-0 w-80 bottom-0">
                <StreamChat
                  streamId={id || routeSlug}
                  creatorUserId={dbStream.user_id}
                  isLoggedIn={!!user}
                  onTipClick={() => setTipOpen(true)}
                  creditsBalance={creditsBalance}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile chat — hide when offline */}
        {(isActive || isVod) && (
          <div className="lg:hidden">
            <MobileChatDrawer
              streamId={id || routeSlug}
              creatorUserId={dbStream.user_id}
              isLoggedIn={!!user}
              onTipClick={() => setTipOpen(true)}
              creditsBalance={creditsBalance}
            />
          </div>
        )}

        {isVod && (
          <SharePanel
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            contentType={contentType === 'recording' ? 'recording' : 'clip'}
            contentId={id || ''}
            title={dbStream.title || 'Recording'}
            playbackId={dbStream.mux_playback_id}
            muxAssetId={dbStream.mux_asset_id}
            creatorUsername={creatorUsername || profile?.username}
            contentSlug={dbStream.slug}
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
