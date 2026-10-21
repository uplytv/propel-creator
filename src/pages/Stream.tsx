import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Heart, ThumbsDown, UserPlus, Check, Share2, Shield, TrendingUp, Zap, Crown, Radio, Coins, Loader2, ShoppingBag, Scissors, Repeat2 } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UPLYMuxPlayer from "@/components/MuxPlayer";
import WebRTCPlayer from "@/components/live/WebRTCPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "@/components/FollowButton";
import { useFollows } from "@/hooks/useFollows";
import ClipCreator from "@/components/clips/ClipCreator";
import SharePanel from "@/components/share/SharePanel";
import { MUX_LIVE_STREAM_COLUMNS } from "@/lib/safeColumns";
import SEOHead from "@/components/SEOHead";
import RecentRecordingsRow from "@/components/live/RecentRecordingsRow";
import LiveEventBanner from "@/components/live/LiveEventBanner";
import StickyBuyTicketBar from "@/components/live/StickyBuyTicketBar";
import StreamEmailCapture from "@/components/live/StreamEmailCapture";
import PPVPaywall, { useStreamPpvGate } from "@/components/live/PPVPaywall";
import { useMemberSubscriptionStatus } from "@/hooks/usePaymentReturn";
import VideoComments from "@/components/video/VideoComments";

// Wrapper that fetches real event data for the ticket bar
function StickyBuyTicketBarWithEvent({ eventId, streamId, fallbackTitle }: { eventId: string; streamId: string; fallbackTitle: string }) {
  const [eventData, setEventData] = useState<any>(null);
  useEffect(() => {
    supabase.from("events").select("id, title, ticket_price, is_free, ticket_quantity, is_sold_out, status").eq("id", eventId).maybeSingle()
      .then(({ data }) => { if (data) setEventData(data); });
  }, [eventId]);
  // Also get tickets sold count
  const [ticketsSold, setTicketsSold] = useState(0);
  useEffect(() => {
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active")
      .then(({ count }) => setTicketsSold(count || 0));
  }, [eventId]);
  if (!eventData || eventData.is_sold_out) return null;
  return (
    <StickyBuyTicketBar
      event={{
        id: eventData.id,
        title: eventData.title || fallbackTitle,
        ticket_price: eventData.ticket_price || 0,
        is_free: eventData.is_free || false,
        ticket_quantity: eventData.ticket_quantity,
        tickets_sold: ticketsSold,
      }}
      streamId={streamId}
    />
  );
}

// Cross-sell rail shown to viewers under the stream info: join-community CTA
// (cheapest active tier) + latest course/classroom CTA with enrollment count.
function CreatorOfferRow({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: memberSub } = useMemberSubscriptionStatus(creatorId);
  const isMember = memberSub?.status === "active";
  const [tier, setTier] = useState<{ price_monthly: number } | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [enrollCount, setEnrollCount] = useState<number | null>(null);
  const [ownsCourse, setOwnsCourse] = useState(false);

  useEffect(() => {
    if (!creatorId) return;
    (supabase as any)
      .from("subscription_tiers")
      .select("price_monthly")
      .eq("creator_id", creatorId)
      .eq("is_active", true)
      .order("price_monthly", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => setTier(data));
    (supabase as any)
      .from("products")
      .select("id, name, price, type")
      .eq("creator_id", creatorId)
      .eq("status", "active")
      .in("type", ["course", "classroom"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => setCourse(data));
  }, [creatorId]);

  // Classroom head-count + owned state
  useEffect(() => {
    if (!course?.id) return;
    supabase
      .from("product_purchases")
      .select("id", { count: "exact", head: true })
      .eq("product_id", course.id)
      .then(({ count }) => setEnrollCount(count ?? 0));
    if (user) {
      supabase
        .from("product_purchases")
        .select("id")
        .eq("product_id", course.id)
        .eq("buyer_id", user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setOwnsCourse(!!data));
    }
  }, [course?.id, user?.id]);

  const showCommunity = !!tier && !isMember;
  if (!showCommunity && !course) return null;

  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-2">
      {showCommunity && (
        <button
          onClick={() => navigate(`/community/${creatorId}`)}
          className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30 hover:border-primary/40 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-base flex-shrink-0">🤝</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Join {creatorName}'s community</p>
            <p className="text-xs text-muted-foreground">
              From ${Number(tier!.price_monthly).toFixed(0)}/month · members-only streams & posts
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground flex-shrink-0">Join →</span>
        </button>
      )}
      {course && (
        <button
          onClick={() => navigate(`/community/${creatorId}`, { state: { tab: "classroom" } })}
          className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30 hover:border-primary/40 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-base flex-shrink-0">📚</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{course.name}</p>
            <p className="text-xs text-muted-foreground">
              {ownsCourse
                ? "You're enrolled — continue learning"
                : `${Number(course.price) > 0 ? `$${course.price}` : "Free"}${enrollCount ? ` · ${enrollCount} enrolled` : ""}`}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground flex-shrink-0">
            {ownsCourse ? "Open →" : "View →"}
          </span>
        </button>
      )}
    </div>
  );
}

function StreamActionBtn({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center min-w-[56px] px-2 py-2 rounded-xl transition-all hover:bg-secondary/60 active:scale-95"
    >
      <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      {count !== undefined && <span className={`text-[11px] font-semibold mt-0.5 ${active ? "text-primary" : "text-foreground"}`}>{count}</span>}
      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}

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
          // Auto-redirect to the recording instead of showing dead-end
          navigate(`/stream/${exactRecording.id}?type=recording`, { replace: true });
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
  const [likeCount, setLikeCount] = useState(0);
  const [disliked, setDisliked] = useState(false);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(100);
  const [dbStream, setDbStream] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRealStream, setIsRealStream] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [memberAccess, setMemberAccess] = useState<boolean | null>(null);
  const [joinRequested, setJoinRequested] = useState(false);
  const [joinStream, setJoinStream] = useState<MediaStream | null>(null);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'requesting' | 'accepted' | 'rejected'>('idle');
  const [creatorUsername, setCreatorUsername] = useState<string | null>(routeUsername || null);
  // VOD playback <video> element — drives chat-replay sync in VideoComments
  const [vodVideoEl, setVodVideoEl] = useState<HTMLVideoElement | null>(null);
  const { isFollowing, follow, unfollow } = useFollows();

  const searchParams = new URLSearchParams(window.location.search);
  const contentType = searchParams.get('type');
  const isFromCreatorRoute = !!routeUsername;
  const isFromSlugRoute = !!routeSlug;
  // Treat as VOD only when content is explicitly a recording/VOD.
  // An ended live row still holds the LIVE mux_playback_id (not a VOD asset),
  // so treating it as VOD here would render a broken on-demand player instead of
  // falling through to StreamEndedState (which polls for and redirects to the recording).
  const isStreamEnded = !!(dbStream && dbStream.status !== 'active' && !dbStream._isRecording);
  const isVod = contentType === 'vod' || contentType === 'recording' || (isFromCreatorRoute && !isFromSlugRoute) || !!dbStream?._isRecording;

  // Viewer features
  const viewerRewards = useViewerRewards(!!dbStream && dbStream.status === 'active' && !isVod);
  const viewerCaptions = useLiveCaptions();
  const raidSystem = useRaidSystem(id, false);
  const predictions = useStreamPredictions(id || '');
  const giftSub = useGiftSubscription(id || '', dbStream?.user_id || '');
  const liveQuiz = useLiveQuiz(id, false);
  const sentiment = useViewerSentiment(id);

  // PPV gate — access + playback id are server-verified via the
  // get_stream_playback SECURITY DEFINER RPC. Free streams skip the RPC
  // entirely (mightBePpv=false) and behave exactly as before. Recordings and
  // VOD assets always resolve once, since their PPV flag lives on the source
  // stream (migration 20260706160000_ppv_access.sql).
  const ppvRefType: 'stream' | 'recording' | 'asset' = dbStream?._isRecording
    ? 'recording'
    : dbStream?._isAsset
      ? 'asset'
      : 'stream';
  const ppvMightBe = !!dbStream && (ppvRefType !== 'stream' ? true : !!dbStream.is_ppv);
  const ppvGate = useStreamPpvGate(dbStream?.id, ppvRefType, ppvMightBe);

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
            .select(MUX_LIVE_STREAM_COLUMNS)
            .eq('slug', routeSlug)
            .order('created_at', { ascending: false })
            .limit(1);

          if (routeProfile?.user_id) {
            streamQuery = streamQuery.eq('user_id', routeProfile.user_id);
          }

          const { data: muxStream } = await streamQuery.maybeSingle();

        if (muxStream) {
          const isStreamActive = muxStream.status === 'active';
          const hasPlaybackId = !!muxStream.mux_playback_id;

          // If stream is ended/idle with no playback, try to find its recording
          if (!isStreamActive && !hasPlaybackId) {
            // Look up recording via live_stream_sessions
            const { data: session } = await supabase
              .from('live_stream_sessions')
              .select('mux_asset_id')
              .eq('stream_id', muxStream.id)
              .not('mux_asset_id', 'is', null)
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (session?.mux_asset_id) {
              const { data: rec } = await supabase
                .from('stream_recordings')
                .select('*')
                .eq('mux_asset_id', session.mux_asset_id)
                .maybeSingle();

              if (rec) {
                setDbStream({
                  ...rec,
                  mux_playback_id: rec.playback_id,
                  user_id: rec.creator_id,
                  title: rec.title || muxStream.title,
                  _isRecording: true,
                  event_id: (muxStream as any).event_id || null,
                  is_event_stream: (muxStream as any).is_event_stream || false,
                });
                setIsRealStream(true);
                const prof = routeProfile || (await supabase
                  .from('profiles')
                  .select('display_name, avatar_url, tier, tier_name, username')
                  .eq('user_id', rec.creator_id)
                  .single()).data;
                setProfile(prof);
                if (prof?.username) setCreatorUsername(prof.username);
                setLoading(false);
                return;
              }
            }
          }

          // Normal: stream found with playback
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
        } else {
          // No mux_live_streams found — try stream_recordings by slug
          let recQuery = supabase
            .from('stream_recordings')
            .select('*')
            .eq('slug', routeSlug)
            .order('created_at', { ascending: false })
            .limit(1);

          if (routeProfile?.user_id) {
            recQuery = recQuery.eq('creator_id', routeProfile.user_id);
          }

          const { data: rec } = await recQuery.maybeSingle();
          if (rec) {
            // Look up original stream for event linkage
            let recEventId: string | null = null;
            let recIsEventStream = false;
            if (rec.mux_asset_id) {
              const { data: recSession } = await supabase
                .from('live_stream_sessions')
                .select('stream_id')
                .eq('mux_asset_id', rec.mux_asset_id)
                .limit(1)
                .maybeSingle();
              if (recSession?.stream_id) {
                const { data: origS } = await supabase
                  .from('mux_live_streams')
                  .select('event_id, is_event_stream')
                  .eq('id', recSession.stream_id)
                  .maybeSingle();
                if (origS) {
                  recEventId = origS.event_id;
                  recIsEventStream = origS.is_event_stream || false;
                }
              }
            }
            setDbStream({
              ...rec,
              mux_playback_id: rec.playback_id,
              user_id: rec.creator_id,
              _isRecording: true,
              event_id: recEventId,
              is_event_stream: recIsEventStream,
            });
            setIsRealStream(true);
            const prof = routeProfile || (await supabase
              .from('profiles')
              .select('display_name, avatar_url, tier, tier_name, username')
              .eq('user_id', rec.creator_id)
              .single()).data;
            setProfile(prof);
            if (prof?.username) setCreatorUsername(prof.username);
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
          // Look up original stream for event linkage
          let evId: string | null = null;
          let evStream = false;
          if (rec.mux_asset_id) {
            const { data: sess } = await supabase
              .from('live_stream_sessions')
              .select('stream_id')
              .eq('mux_asset_id', rec.mux_asset_id)
              .limit(1)
              .maybeSingle();
            if (sess?.stream_id) {
              const { data: orig } = await supabase
                .from('mux_live_streams')
                .select('event_id, is_event_stream')
                .eq('id', sess.stream_id)
                .maybeSingle();
              if (orig) {
                evId = orig.event_id;
                evStream = orig.is_event_stream || false;
              }
            }
          }
          setDbStream({
            ...rec,
            mux_playback_id: rec.playback_id,
            user_id: rec.creator_id,
            _isRecording: true,
            event_id: evId,
            is_event_stream: evStream,
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
            setDbStream({ ...asset, _isAsset: true });
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
            .select(MUX_LIVE_STREAM_COLUMNS)
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
          setDbStream({ ...asset, _isAsset: true });
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
        // Try stream_recordings first (handles shared recording links)
        const { data: rec } = await supabase
          .from('stream_recordings')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (rec) {
          // Look up the original stream to get event linkage
          let eventId: string | null = null;
          let isEventStream = false;
          if (rec.mux_asset_id) {
            const { data: session } = await supabase
              .from('live_stream_sessions')
              .select('stream_id')
              .eq('mux_asset_id', rec.mux_asset_id)
              .limit(1)
              .maybeSingle();
            if (session?.stream_id) {
              const { data: origStream } = await supabase
                .from('mux_live_streams')
                .select('event_id, is_event_stream')
                .eq('id', session.stream_id)
                .maybeSingle();
              if (origStream) {
                eventId = origStream.event_id;
                isEventStream = origStream.is_event_stream || false;
              }
            }
          }
          setDbStream({
            ...rec,
            mux_playback_id: rec.playback_id,
            user_id: rec.creator_id,
            _isRecording: true,
            event_id: eventId,
            is_event_stream: isEventStream,
          });
          setIsRealStream(true);
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, tier, tier_name, username')
            .eq('user_id', rec.creator_id)
            .maybeSingle();
          setProfile(prof);
          if (prof?.username) setCreatorUsername(prof.username);
          setLoading(false);
          return;
        }

        // Then try mux_live_streams
        const { data: muxStream } = await supabase
          .from('mux_live_streams')
          .select(MUX_LIVE_STREAM_COLUMNS)
          .eq('id', id)
          .maybeSingle();

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
      // Realtime for stream_recordings — auto-update when recording becomes ready
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stream_recordings',
        filter: `id=eq.${id}`,
      }, (payload: any) => {
        if (payload.new.status === 'ready' && payload.new.playback_id) {
          setDbStream((prev: any) => ({
            ...prev,
            ...payload.new,
            mux_playback_id: payload.new.playback_id,
            status: 'ready',
          }));
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
    // PPV playback ids are vaulted server-side; the RPC hands them out only to
    // entitled viewers. Free streams keep using the public column.
    const playbackId = ppvGate.playbackId || dbStream.mux_playback_id;
    // Signed playback (PPV URL-sharing defense): sign-playback-token mints a
    // per-viewer JWT when the playback id is signed-policy. Null for free
    // streams, legacy public-policy PPV streams, or unset signing secrets —
    // the plain URL then plays exactly as before.
    const playbackToken = ppvGate.playbackToken || undefined;
    const isPrivateStream = dbStream.is_public === false;
    const isOwner = user?.id === dbStream.user_id;
    const subscribed = dbStream.user_id ? isFollowing(dbStream.user_id) : false;
    const ppvPending = ppvMightBe && !ppvGate.checked;
    const ppvLocked = ppvGate.checked && ppvGate.isPpv && !ppvGate.allowed && !isOwner;

    // PPV access check still in flight — don't flash "unavailable" or paywall
    if (ppvPending) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      );
    }

    // Guard: no playback ID available — try to resolve recording before giving up.
    // Skipped when PPV-locked: the paywall renders below without a playback id.
    if (!playbackId && !ppvLocked) {
      // For non-active streams, attempt to find the recording
      if (!isActive && dbStream.id) {
        const tryResolveRecording = async () => {
          // Check live_stream_sessions for a linked recording
          const { data: session } = await supabase
            .from('live_stream_sessions')
            .select('mux_asset_id')
            .eq('stream_id', dbStream.id)
            .not('mux_asset_id', 'is', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (session?.mux_asset_id) {
            const { data: rec } = await supabase
              .from('stream_recordings')
              .select('id')
              .eq('mux_asset_id', session.mux_asset_id)
              .maybeSingle();
            if (rec) {
              navigate(`/stream/${rec.id}?type=recording`, { replace: true });
              return;
            }
          }

          // Note: previously had an unsafe fallback that redirected to the most
          // recent recording by this creator regardless of which stream the viewer
          // came from. Removed — viewers landing on an ended stream without a
          // linked recording should see StreamEndedState instead of being silently
          // redirected to an unrelated VOD.
        };
        tryResolveRecording();
      }

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
          image={playbackId
            ? (ppvGate.thumbnailToken
              // Signed thumbnails: params must live in the token, so only ?token= is sent
              ? `https://image.mux.com/${playbackId}/thumbnail.webp?token=${encodeURIComponent(ppvGate.thumbnailToken)}`
              : `https://image.mux.com/${playbackId}/thumbnail.webp?width=1200&height=630`)
            : undefined}
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
              {ppvLocked && (isActive || isVod) ? (
                <PPVPaywall
                  title={dbStream.title || (isVod ? 'Recording' : 'Live Stream')}
                  creatorName={creatorName}
                  price={ppvGate.price}
                  ppvProductId={ppvGate.ppvProductId}
                  isLive={isActive}
                  onRefresh={ppvGate.refresh}
                  onCheckoutStarted={ppvGate.startUnlockPoll}
                />
              ) : isVod && (!playbackId || (dbStream._isRecording && dbStream.status !== 'ready' && !playbackId)) ? (
                <div className="w-full aspect-video bg-muted/50 flex items-center justify-center border-b border-border">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                    <h2 className="text-lg font-bold text-foreground mb-1">Processing your recording...</h2>
                    <p className="text-sm text-muted-foreground">This usually takes 2–5 minutes. This page will update automatically.</p>
                  </div>
                </div>
              ) : (isVod && playbackId) ? (
                <UPLYMuxPlayer
                  playbackId={playbackId}
                  playbackToken={playbackToken}
                  onPlaybackForbidden={ppvGate.handlePlaybackAuthError}
                  title={dbStream.title || 'Recording'}
                  autoPlay
                  muted={false}
                  streamType="on-demand"
                  onVideoRef={setVodVideoEl}
                />
              ) : isActive && dbStream.stream_type === 'browser' ? (
                <WebRTCPlayer
                  streamId={dbStream.id}
                  playbackId={playbackId || undefined}
                  playbackToken={playbackToken}
                  title={dbStream.title || 'Live Stream'}
                />
              ) : isActive && playbackId ? (
                <UPLYMuxPlayer
                  playbackId={playbackId}
                  playbackToken={playbackToken}
                  onPlaybackForbidden={ppvGate.handlePlaybackAuthError}
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

              {/* Guest Join Panel */}
              {isActive && new URLSearchParams(window.location.search).get('join') === '1' && user && (
                <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
                  <div className="w-80 rounded-2xl p-6 text-center" style={{ backgroundColor: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {joinStatus === 'idle' && (
                      <>
                        <p className="text-lg font-bold text-white mb-1">You've been invited to go live</p>
                        <p className="text-xs text-white/50 mb-4">Your camera and mic will be visible to all viewers</p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              setJoinStatus('requesting');
                              try {
                                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                setJoinStream(stream);
                                // requestToJoin would be called via the costream hook on viewer side
                              } catch { setJoinStatus('idle'); }
                            }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                            style={{ backgroundColor: '#3D7CFF', color: '#0A0A0A' }}
                          >
                            Join Live 🎙️
                          </button>
                          <button
                            onClick={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.delete('join');
                              window.history.replaceState({}, '', url.toString());
                              setJoinStatus('idle');
                            }}
                            className="px-4 py-2.5 rounded-xl text-sm text-white/50 border border-white/10"
                          >
                            Decline
                          </button>
                        </div>
                      </>
                    )}
                    {joinStatus === 'requesting' && <p className="text-white text-sm">⏳ Waiting for host to accept…</p>}
                    {joinStatus === 'accepted' && <p className="text-sm" style={{ color: '#3D7CFF' }}>✅ You're live!</p>}
                    {joinStatus === 'rejected' && <p className="text-red-400 text-sm">The host declined your request</p>}
                  </div>
                </div>
              )}

              {/* Viewer Engagement Overlay — only on active live streams (hidden behind PPV paywall) */}
              {isActive && id && !ppvLocked && (
                <>
                  <ViewerEngagementOverlay
                    streamId={id}
                    streamTitle={dbStream.title || 'Live Stream'}
                    creatorUserId={dbStream.user_id}
                  />
                  {!user && (
                    <StreamEmailCapture
                      creatorId={dbStream.user_id}
                      creatorName={creatorName}
                      streamId={id}
                    />
                  )}
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

            {/* Live Event Banner — when stream is linked to an event */}
            {isActive && dbStream.is_event_stream && dbStream.event_id && (
              <LiveEventBanner eventId={dbStream.event_id} streamId={dbStream.id} />
            )}

            {/* Stream info */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h1 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">{dbStream.title || 'Untitled Stream'}</h1>

              {/* YouTube-style Action Bar — VOD / Recording */}
              {(isVod || !isActive) && (
                <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 mb-3">
                  <StreamActionBtn
                    icon={<Heart className={`w-5 h-5 ${liked ? "fill-current text-primary" : ""}`} />}
                    label="Like"
                    count={likeCount}
                    active={liked}
                    onClick={() => { setLiked(l => !l); setLikeCount(c => liked ? c - 1 : c + 1); if (disliked) { setDisliked(false); setDislikeCount(c => c - 1); } }}
                  />
                  <StreamActionBtn
                    icon={<ThumbsDown className={`w-5 h-5 ${disliked ? "fill-current text-primary" : ""}`} />}
                    label="Dislike"
                    count={dislikeCount}
                    active={disliked}
                    onClick={() => { setDisliked(d => !d); setDislikeCount(c => disliked ? c - 1 : c + 1); if (liked) { setLiked(false); setLikeCount(c => c - 1); } }}
                  />
                  {!isOwner && dbStream.user_id && (
                    <StreamActionBtn
                      icon={subscribed ? <Check className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5" />}
                      label={subscribed ? "Subscribed" : "Subscribe"}
                      active={subscribed}
                      onClick={() => subscribed ? unfollow(dbStream.user_id) : follow(dbStream.user_id)}
                    />
                  )}
                  <StreamActionBtn
                    icon={<Zap className="w-5 h-5" />}
                    label="Energy"
                    active={false}
                    onClick={() => setTipOpen(true)}
                  />
                  <StreamActionBtn
                    icon={<Share2 className="w-5 h-5" />}
                    label="Share"
                    active={false}
                    onClick={() => setShareOpen(true)}
                  />
                  <StreamActionBtn
                    icon={<ShoppingBag className="w-5 h-5" />}
                    label="Shop"
                    active={false}
                    onClick={() => toast("No shop items for this recording")}
                  />
                  <StreamActionBtn
                    icon={<Repeat2 className="w-5 h-5" />}
                    label="Remix"
                    active={false}
                    onClick={() => toast("Remix coming soon")}
                  />
                </div>
              )}

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
                {!isOwner && <FollowButton targetUserId={dbStream.user_id} />}
              </div>
              {dbStream.description && (
                <p className="text-sm text-muted-foreground mt-3 hidden sm:block">{dbStream.description}</p>
              )}

              {/* Community + course cross-sell — viewers only */}
              {!isOwner && dbStream.user_id && (
                <CreatorOfferRow creatorId={dbStream.user_id} creatorName={creatorName} />
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

            {/* Comments + chat replay — YouTube model: live chat only while
                live; every non-live playback (vod/recording/asset) gets a real
                comments section instead. Recordings additionally get a
                read-only "Chat replay" tab synced to player time. */}
            {isVod && (
              <div className="px-4 sm:px-6 py-5 border-b border-border max-w-3xl">
                <VideoComments
                  refId={dbStream.id}
                  refType={ppvRefType}
                  contentOwnerId={dbStream.user_id}
                  muxAssetId={dbStream._isRecording ? dbStream.mux_asset_id : null}
                  videoEl={vodVideoEl}
                />
              </div>
            )}

            {/* Related recordings when stream is offline */}
            {!isActive && !isVod && dbStream.user_id && (
              <div className="px-4 sm:px-6 py-5">
                <h3 className="text-sm font-bold text-foreground mb-3">More from this creator</h3>
                <RecentRecordingsRow creatorId={dbStream.user_id} />
              </div>
            )}
          </div>

          {/* Chat sidebar - desktop only — LIVE ONLY (YouTube model).
              Never on VOD/recordings: there is no live session, so typed
              messages would silently vanish. Non-live playback gets
              VideoComments (above) instead. */}
          {isActive && (
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

        {/* Mobile chat — LIVE ONLY (same rule as the desktop sidebar) */}
        {isActive && (
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

        {/* Sticky Buy Ticket Bar — event streams (live, VOD, or recording), viewers only */}
        {dbStream.is_event_stream && dbStream.event_id && !isOwner && (
          <StickyBuyTicketBarWithEvent eventId={dbStream.event_id} streamId={dbStream.id} fallbackTitle={dbStream.title || 'Event'} />
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
