import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Share2, ChevronDown, ChevronUp, MessageCircle, Eye, Clock, Send, BarChart3, TrendingUp } from "lucide-react";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";
import SEOHead from "@/components/SEOHead";
import FollowButton from "@/components/FollowButton";
import SharePanel from "@/components/share/SharePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVideo, useVideoComments, useVideoLike, useAddComment, useVideos, type Video } from "@/hooks/useVideos";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data: video, isLoading } = useVideo(resolvedSlug);
  const { data: comments } = useVideoComments(video?.id);
  const { isLiked, toggleLike } = useVideoLike(video?.id);
  const addComment = useAddComment(video?.id);
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentText, setCommentText] = useState("");

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

  // Track view
  useEffect(() => {
    if (!video?.id) return;
    supabase.functions.invoke("mux-check-upload", {
      body: { trackView: true, assetType: "video", assetId: video.id },
    }).catch(() => {});
  }, [video?.id]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync(commentText.trim());
    setCommentText("");
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
      />

      {/* Player */}
      <div className="w-full max-w-5xl mx-auto">
        {video.playback_id ? (
          <UPLYMuxPlayer playbackId={video.playback_id} title={video.title} autoPlay />
        ) : (
          <div className="aspect-video bg-secondary flex items-center justify-center">
            <p className="text-muted-foreground">Video processing…</p>
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={toggleLike}
              className="gap-1.5"
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              {video.like_count}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5">
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>

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
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {video.comment_count} Comments
            </h3>

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
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {comments?.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={c.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{(c.profiles?.display_name || "U").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{c.profiles?.display_name || "User"}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.body}</p>
                  </div>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
              )}
            </div>
          </div>
          {/* Creator Analytics Card (visible only to video owner) */}
          {user && video.creator_id === user.id && (
            <VideoAnalyticsCard videoId={video.id} viewCount={video.view_count} likeCount={video.like_count} commentCount={video.comment_count} createdAt={video.created_at} durationSeconds={video.duration_seconds} />
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
