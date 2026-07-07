import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ThumbsDown, UserPlus, Check, Zap, Share2, ShoppingBag, Repeat2, ChevronDown, ChevronUp, MessageCircle, Eye, Clock, Send, BarChart3, TrendingUp } from "lucide-react";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";
import { useWatchTimeTracker } from "@/hooks/useWatchTimeTracker";
import { useFollows } from "@/hooks/useFollows";
import { toast } from "sonner";
import SEOHead, { buildVideoSchema } from "@/components/SEOHead";
import FollowButton from "@/components/FollowButton";
import SharePanel from "@/components/share/SharePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVideo, useVideoComments, useVideoLike, useAddComment, type Video, type CommentSort } from "@/hooks/useVideos";
import CommentThread from "@/components/video/CommentThread";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ChapterRail from "@/components/video/ChapterRail";
import ChapterEditor from "@/components/video/ChapterEditor";
import { useVideoChapters } from "@/hooks/useVideoChapters";
import AddToPlaylistButton from "@/components/video/AddToPlaylistButton";
import NextUpCard from "@/components/video/NextUpCard";
import BoostButton from "@/components/video/BoostButton";
import { usePlaylistItems } from "@/hooks/usePlaylists";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export default function VideoPlayer() {
  const { slug, id: videoId, username } = useParams<{ slug: string; id: string; username: string }>();
  const resolvedSlug = slug || videoId; // /creator/:username/videos/:id uses 'id' param
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get("playlist") || undefined;
  const { data: video, isLoading } = useVideo(resolvedSlug);
  const [commentSort, setCommentSort] = useState<CommentSort>("top");
  const { data: comments } = useVideoComments(video?.id, commentSort);
  const { isLiked, toggleLike } = useVideoLike(video?.id);
  const addComment = useAddComment(video?.id);
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [disliked, setDisliked] = useState(false);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ended, setEnded] = useState(false);
  const { isFollowing, follow, unfollow } = useFollows();
  const isOwner = user?.id === video?.creator_id;
  const subscribed = video?.creator_id ? isFollowing(video.creator_id) : false;
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // Chapters (video_chapters) — shared by ChapterRail and the in-player markers
  const { data: playerChapters } = useVideoChapters(video?.id);

  // Watch-time tracking → drives UPLY discovery algorithm
  useWatchTimeTracker({
    contentId: video?.id,
    contentType: "video",
    durationSeconds: video?.duration_seconds,
    category: video?.category,
    getCurrentTime: () => videoElRef.current?.currentTime ?? 0,
    enabled: !!video?.id && !!video?.duration_seconds,
  });

  // Attach time/ended listeners for chapter highlight + autoplay
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onEnded = () => setEnded(true);
    const onPlay = () => setEnded(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
    };
  }, [video?.id]);

  // Playlist context for next-up
  const { data: playlistItems } = usePlaylistItems(playlistId);

  // Fetch creator profile
  const { data: creator } = useQuery({
    queryKey: ["video-creator", video?.creator_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .eq("user_id", video!.creator_id)
        .maybeSingle();
      return data;
    },
    enabled: !!video?.creator_id,
  });

  // Related videos (same category)
  const { data: related } = useQuery({
    queryKey: ["related-videos", video?.category, video?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .eq("is_public", true)
        .eq("category", video!.category!)
        .neq("id", video!.id)
        .order("trending_score", { ascending: false })
        .limit(6);
      return (data || []) as Video[];
    },
    enabled: !!video?.id && !!video?.category,
  });

  // Resolve next-up video (playlist context wins, else first related)
  const nextUp = useMemo(() => {
    if (playlistItems && playlistItems.length > 0 && video?.id) {
      const idx = playlistItems.findIndex((it: any) => it.video_id === video.id);
      const next: any = idx >= 0 && idx < playlistItems.length - 1 ? playlistItems[idx + 1].videos : null;
      if (next) {
        return {
          id: next.id,
          title: next.title,
          thumbnail_url: next.thumbnail_url,
          slug: next.slug,
          creator_username: null,
        };
      }
    }
    const r = related?.[0];
    return r ? { id: r.id, title: r.title, thumbnail_url: r.thumbnail_url, slug: r.slug, creator_username: null } : null;
  }, [playlistItems, related, video?.id]);

  // Track view after 3s of playback
  useEffect(() => {
    if (!video?.id) return;
    const timer = setTimeout(async () => {
      await supabase
        .from("videos")
        .update({ view_count: (video.view_count || 0) + 1 })
        .eq("id", video.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [video?.id]);

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      await addComment.mutateAsync({ body: text });
      setCommentText("");
    } catch {
      /* toast already handled */
    }
  };

  const creatorName = creator?.display_name || "Creator";
  const creatorUsername = creator?.username || creatorName;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="w-full aspect-video" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Video not found</h1>
          <Button variant="outline" onClick={() => navigate("/discover")}>Back to Discover</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${video.title} — ${creatorName} on UPLY`}
        description={video.description || `Watch ${video.title} by ${creatorName} on UPLY`}
        type="video.other"
        image={video.playback_id ? `https://image.mux.com/${video.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop` : undefined}
        jsonLd={buildVideoSchema({
          name: video.title,
          description: video.description || `Watch ${video.title} by ${creatorName} on UPLY`,
          thumbnailUrl: video.playback_id ? `https://image.mux.com/${video.playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop` : "",
          uploadDate: (video as any).created_at || new Date().toISOString(),
          duration: (video as any).duration_seconds,
          embedUrl: video.playback_id ? `https://stream.mux.com/${video.playback_id}.m3u8` : undefined,
          creatorName,
        })}
      />

      {/* Player */}
      <div className="w-full max-w-5xl mx-auto relative">
        {video.playback_id ? (
          <UPLYMuxPlayer
            playbackId={video.playback_id}
            title={video.title}
            autoPlay
            onVideoRef={(el) => { videoElRef.current = el; }}
            chapters={playerChapters}
          />
        ) : (
          <div className="aspect-video bg-secondary flex items-center justify-center">
            <p className="text-muted-foreground">Video processing…</p>
          </div>
        )}
        {nextUp && (
          <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:max-w-sm pointer-events-auto z-10">
            <NextUpCard
              next={nextUp}
              triggered={ended}
              onCancel={() => setEnded(false)}
            />
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Title & stats */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{video.title}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{video.view_count.toLocaleString()} views</span>
              <span>{formatDate(video.created_at)}</span>
            </div>
          </div>

          {/* Chapters */}
          <ChapterRail
            videoId={video.id}
            currentTime={currentTime}
            onSeek={(s) => { if (videoElRef.current) { videoElRef.current.currentTime = s; videoElRef.current.play?.(); } }}
          />

          {/* Action Bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {/* Like */}
            <ActionBtn
              icon={<Heart className={`w-5 h-5 ${isLiked ? "fill-current text-primary" : ""}`} />}
              label="Like"
              count={video.like_count}
              active={isLiked}
              onClick={toggleLike}
            />
            {/* Dislike */}
            <ActionBtn
              icon={<ThumbsDown className={`w-5 h-5 ${disliked ? "fill-current text-primary" : ""}`} />}
              label="Dislike"
              count={dislikeCount}
              active={disliked}
              onClick={() => { setDisliked(d => !d); setDislikeCount(c => disliked ? c - 1 : c + 1); }}
            />
            {/* Subscribe */}
            {!isOwner && video.creator_id && (
              <ActionBtn
                icon={subscribed ? <Check className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5" />}
                label={subscribed ? "Subscribed" : "Subscribe"}
                active={subscribed}
                onClick={() => subscribed ? unfollow(video.creator_id) : follow(video.creator_id)}
              />
            )}
            {/* Energy / Tip */}
            <ActionBtn
              icon={<Zap className="w-5 h-5" />}
              label="Energy"
              active={false}
              onClick={() => setTipOpen(true)}
            />
            {/* Share */}
            <ActionBtn
              icon={<Share2 className="w-5 h-5" />}
              label="Share"
              active={false}
              onClick={() => setShareOpen(true)}
            />
            {/* Shop */}
            <ActionBtn
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Shop"
              active={false}
              onClick={() => toast("No shop items for this video")}
            />
            {/* Remix */}
            <ActionBtn
              icon={<Repeat2 className="w-5 h-5" />}
              label="Remix"
              active={false}
              onClick={() => setRemixOpen(true)}
            />
            {/* Save to Playlist */}
            {user && (
              <div className="shrink-0">
                <AddToPlaylistButton videoId={video.id} />
              </div>
            )}
          </div>

          {/* Tip Modal */}
          {tipOpen && <TipModal onClose={() => setTipOpen(false)} creatorName={creatorName} />}
          {/* Remix Modal */}
          {remixOpen && <RemixModal onClose={() => setRemixOpen(false)} />}

          {/* Chapter Editor (owner only) */}
          {isOwner && <ChapterEditor videoId={video.id} />}

          {/* Creator */}
          <div className="flex items-center gap-3 py-3 border-y border-border">
            <button onClick={() => navigate(`/creator/${encodeURIComponent(creatorUsername)}`)} className="shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarImage src={creator?.avatar_url} />
                <AvatarFallback>{creatorName.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => navigate(`/creator/${encodeURIComponent(creatorUsername)}`)}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                {creatorName}
              </button>
            </div>
            <FollowButton targetUserId={video.creator_id} size="sm" />
          </div>

          {/* Description */}
          {video.description && (
            <div>
              <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${descExpanded ? "" : "line-clamp-3"}`}>
                {video.description}
              </p>
              {video.description.length > 200 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs text-primary font-medium mt-1 flex items-center gap-0.5"
                >
                  {descExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => navigate(`/discover?search=${encodeURIComponent(tag)}`)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Comments */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> {video.comment_count} Comments
              </h3>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setCommentSort("top")}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    commentSort === "top"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Top
                </button>
                <button
                  onClick={() => setCommentSort("newest")}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    commentSort === "newest"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Newest
                </button>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  className="bg-secondary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || addComment.isPending}
                  aria-label="Post comment"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {comments?.map((c) => (
                <CommentThread key={c.id} comment={c} videoId={video.id} />
              ))}
              {(!comments || comments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
              )}
            </div>
          </div>
          {/* Creator Analytics Card (visible only to video owner) */}
          {user && video.creator_id === user.id && (
            <>
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">🚀 Get more views</p>
                  <p className="text-xs text-muted-foreground">Boost this video to the top of the Discover feed.</p>
                </div>
                <BoostButton contentId={video.id} contentType="video" variant="compact" />
              </div>
              <VideoAnalyticsCard videoId={video.id} viewCount={video.view_count} likeCount={video.like_count} commentCount={video.comment_count} createdAt={video.created_at} durationSeconds={video.duration_seconds} />
            </>
          )}
        </div>

        {/* Related videos sidebar */}
        <div className="w-full lg:w-80 px-4 lg:px-0 lg:pr-4 py-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Related Videos</h3>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {related?.map((v) => (
              <RelatedVideoCard key={v.id} video={v} />
            ))}
            {(!related || related.length === 0) && (
              <p className="text-xs text-muted-foreground col-span-2">No related videos yet.</p>
            )}
          </div>
        </div>
      </div>

      <SharePanel
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        contentType="recording"
        contentId={video.id}
        title={video.title}
        playbackId={video.playback_id}
        creatorUsername={creatorUsername}
        contentSlug={video.slug || undefined}
      />
    </div>
  );
}

function ActionBtn({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
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

function TipModal({ onClose, creatorName }: { onClose: () => void; creatorName: string }) {
  const amounts = [1, 3, 5, 10];
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Send Energy</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
        </div>
        <p className="text-sm text-muted-foreground">Support <span className="text-foreground font-semibold">{creatorName}</span> with a tip</p>
        <div className="grid grid-cols-4 gap-2">
          {amounts.map(a => (
            <button key={a} onClick={() => { setSelected(a); setCustom(""); }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${selected === a ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/30"}`}>
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number" placeholder="Custom amount" value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null); }}
          className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          style={{ fontSize: 16 }}
        />
        <Button className="w-full" onClick={() => { toast.success(`$${selected || custom || 0} tip sent to ${creatorName}!`); onClose(); }}
          disabled={!selected && !custom}>
          <Zap className="w-4 h-4" /> Send ${selected || custom || "0"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

function RemixModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
        <Repeat2 className="w-10 h-10 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Remix</h3>
        <p className="text-sm text-muted-foreground">Record or upload your own response video referencing this content.</p>
        <div className="px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-primary font-semibold">Coming Soon</p>
          <p className="text-[11px] text-muted-foreground mt-1">Remix is launching soon. Stay tuned!</p>
        </div>
        <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
      </motion.div>
    </motion.div>
  );
}

function VideoAnalyticsCard({ videoId, viewCount, likeCount, commentCount, createdAt, durationSeconds }: {
  videoId: string; viewCount: number; likeCount: number; commentCount: number; createdAt: string; durationSeconds: number;
}) {
  const daysSincePublish = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const viewsPerDay = (viewCount / daysSincePublish).toFixed(1);
  const engagementRate = viewCount > 0 ? (((likeCount + commentCount) / viewCount) * 100).toFixed(1) : "0.0";
  const estWatchTimeHrs = durationSeconds > 0 ? ((viewCount * durationSeconds * 0.45) / 3600).toFixed(1) : "0";

  const stats = [
    { label: "Total Views", value: viewCount.toLocaleString(), icon: Eye },
    { label: "Views/Day", value: viewsPerDay, icon: TrendingUp },
    { label: "Engagement", value: `${engagementRate}%`, icon: BarChart3 },
    { label: "Est. Watch Time", value: `${estWatchTimeHrs}h`, icon: Clock },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Video Analytics</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Creator Only</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg bg-background/60 border border-border p-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">Published {daysSincePublish}d ago · Engagement = (likes + comments) / views</p>
    </div>
  );
}

function RelatedVideoCard({ video }: { video: Video }) {
  const navigate = useNavigate();
  const { data: creator } = useQuery({
    queryKey: ["video-creator-mini", video.creator_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", video.creator_id)
        .maybeSingle();
      return data;
    },
  });

  const creatorUsername = creator?.username || creator?.display_name || "creator";
  const thumb = video.playback_id
    ? `https://image.mux.com/${video.playback_id}/thumbnail.jpg?width=320&height=180&time=2`
    : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate(`/${encodeURIComponent(creatorUsername)}/videos/${video.slug}`)}
      className="cursor-pointer rounded-xl overflow-hidden border border-border bg-card group"
    >
      <div className="relative aspect-video bg-secondary">
        {thumb ? (
          <img src={thumb} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Eye className="w-6 h-6 text-muted-foreground/40" /></div>
        )}
        {video.duration_seconds > 0 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
            {formatDuration(video.duration_seconds)}
          </span>
        )}
      </div>
      <div className="p-2">
        <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{video.title}</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">{creator?.display_name || "Creator"} · {video.view_count} views</p>
      </div>
    </motion.div>
  );
}
