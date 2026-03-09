import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Heart, Share2, Shield, TrendingUp, Zap, Crown, Radio, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import StreamChat from "@/components/live/StreamChat";
import JoinOverlay from "@/components/live/JoinOverlay";
import TipButton from "@/components/live/TipButton";
import TipOverlay from "@/components/live/TipOverlay";
import MobileChatDrawer from "@/components/live/MobileChatDrawer";
import { mockStreams } from "@/data/mockStreams";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UPLYMuxPlayer from "@/components/MuxPlayer";
import { Skeleton } from "@/components/ui/skeleton";

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

  const searchParams = new URLSearchParams(window.location.search);
  const isVod = searchParams.get('type') === 'vod';

  useEffect(() => {
    const fetchStream = async () => {
      if (!id) return;

      if (isVod) {
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
        }
      }
      setLoading(false);
    };

    fetchStream();
  }, [id, isVod]);

  // Realtime status updates
  useEffect(() => {
    if (!isRealStream || !id) return;

    const channel = supabase
      .channel(`stream-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mux_live_streams',
        filter: `id=eq.${id}`,
      }, (payload: any) => {
        setDbStream((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, isRealStream]);

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
    const playbackId = isVod ? dbStream.mux_playback_id : dbStream.mux_playback_id;

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
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex pt-14">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Video player */}
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
              </div>
              {dbStream.description && (
                <p className="text-sm text-muted-foreground mt-3 hidden sm:block">{dbStream.description}</p>
              )}
            </div>
          </div>

          {/* Chat sidebar - desktop only */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="fixed top-14 right-0 w-80 bottom-0">
              <StreamChat
                isLoggedIn={!!user}
                onTipClick={() => setTipOpen(true)}
                creditsBalance={creditsBalance}
              />
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <MobileChatDrawer
            isLoggedIn={!!user}
            onTipClick={() => setTipOpen(true)}
            creditsBalance={creditsBalance}
          />
        </div>
      </div>
    );
  }

  // Fallback: try mock streams
  const stream = mockStreams.find((s) => s.id === id);

  if (!stream) {
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

  const TierIcon = tierIcons[stream.creatorTier - 1] || Shield;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-3 sm:px-4">
          <button onClick={() => navigate("/live")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="live-badge flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold">
              <span className="live-dot w-2 h-2 rounded-full" />
              LIVE
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {formatViewers(stream.viewers)}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {user && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-warning/10 text-xs">
                <Coins className="w-3.5 h-3.5 text-warning" />
                <span className="font-semibold text-warning">{creditsBalance}</span>
              </div>
            )}
            <TipButton
              creatorName={stream.creatorName}
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
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex pt-14">
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`relative w-full bg-gradient-to-br ${stream.thumbnailGradient} flex items-center justify-center aspect-[9/16] sm:aspect-video`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-foreground/5 backdrop-blur-sm flex items-center justify-center"
              >
                <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-foreground/30" />
              </motion.div>
            </div>
            <TipOverlay />

            {stream.isPublic && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/95 via-background/60 to-transparent hidden sm:block"
              >
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/30">
                      {stream.creatorAvatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Join {stream.creatorName}'s community</p>
                      <p className="text-xs text-muted-foreground">Get full access to all streams, courses & resources</p>
                    </div>
                  </div>
                  <Button variant="hero" size="lg" onClick={() => setJoinOpen(true)} className="flex-shrink-0">
                    Join — ${stream.communityPrice}/mo
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <h1 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">{stream.title}</h1>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {stream.creatorAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{stream.creatorName}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tierColors[stream.creatorTier]}`}>
                      <TierIcon className="w-2.5 h-2.5" />
                      {stream.creatorTierName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stream.category} · Started {stream.startedAt}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 hidden sm:block">{stream.description}</p>
          </div>
        </div>

        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="fixed top-14 right-0 w-80 bottom-0">
            <StreamChat isLoggedIn={!!user} onTipClick={() => setTipOpen(true)} creditsBalance={creditsBalance} />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <MobileChatDrawer isLoggedIn={!!user} onTipClick={() => setTipOpen(true)} creditsBalance={creditsBalance} />
      </div>

      {stream.isPublic && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-30 sm:hidden"
        >
          <div className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3 safe-area-bottom">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/30 flex-shrink-0">
                {stream.creatorAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Join {stream.creatorName}'s community</p>
                <p className="text-[11px] text-muted-foreground">Streams, courses & resources</p>
              </div>
              <Button variant="hero" size="default" onClick={() => setJoinOpen(true)} className="flex-shrink-0 text-sm">
                ${stream.communityPrice}/mo
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <JoinOverlay
        isOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
        creatorName={stream.creatorName}
        creatorAvatar={stream.creatorAvatar}
        communityPrice={stream.communityPrice}
        category={stream.category}
      />
    </div>
  );
}
