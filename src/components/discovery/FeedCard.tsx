import { memo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Users, BookOpen, MoreVertical, Flag, Bookmark, Share2, EyeOff, Heart } from "lucide-react";
import { type FeedItem } from "@/hooks/useDiscoveryFeed";
import { timeAgo } from "@/lib/slugs";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const UPLY_LOGO_PLACEHOLDER = (
  <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)/0.7) 100%)" }}>
    <span className="text-2xl font-bold text-muted-foreground/30 select-none" style={{ fontFamily: "Space Grotesk, sans-serif" }}>U</span>
  </div>
);

interface FeedCardProps {
  item: FeedItem;
  index: number;
  isLiveSection?: boolean;
}

const FeedCard = memo(function FeedCard({ item, index, isLiveSection }: FeedCardProps) {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  const isLive = item.isLive;
  const hasPlaybackId = !!item.playbackId;

  const getDestination = useCallback(() => {
    switch (item.type) {
      case "livestream":
        return item.playbackId ? `/stream/${item.id}` : `/creator/${encodeURIComponent(item.creatorName)}`;
      case "recording":
      case "video":
        if (item.creatorUsername && item.slug) return `/${encodeURIComponent(item.creatorUsername)}/videos/${item.slug}`;
        return `/creator/${encodeURIComponent(item.creatorName)}/videos/${item.id}`;
      case "clip":
        return `/stream/${item.id}`;
      case "course":
        return `/community/${item.creatorId}/classroom`;
      case "community":
        return `/community/${item.creatorId}/community`;
      case "creator":
        return `/creator/${encodeURIComponent(item.creatorName)}`;
      default:
        return `/creator/${encodeURIComponent(item.creatorName)}`;
    }
  }, [item]);

  const handleClick = useCallback(() => {
    navigate(getDestination());
  }, [navigate, getDestination]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 600);
    }
    lastTapRef.current = now;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hasPlaybackId && !isLive) {
      hoverTimerRef.current = setTimeout(() => setShowPreview(true), 500);
    }
  }, [hasPlaybackId, isLive]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowPreview(false);
  }, []);

  const thumbnailUrl = item.imageUrl;
  const animatedGifUrl = hasPlaybackId ? `https://image.mux.com/${item.playbackId}/animated.gif?width=320` : null;

  // Stat text
  const statText = (() => {
    if (isLive) return `${formatCount(item.viewerCount)} watching`;
    if (item.type === "community") return `${formatCount(item.memberCount)} members`;
    if (item.type === "course") return `Course`;
    if (item.type === "creator") return item.creatorType || "Creator";
    return item.viewerCount > 0 ? `${formatCount(item.viewerCount)} views` : null;
  })();

  // Badge
  const badge = (() => {
    if (isLive) return null; // Live badge rendered separately
    if (item.type === "clip") return "CLIP";
    if (item.type === "community") return `${formatCount(item.memberCount)} members`;
    if (item.type === "course") return "COURSE";
    return null;
  })();

  const showDuration = !isLive && (item.type === "video" || item.type === "recording" || item.type === "clip");

  return (
    <div
      className="group cursor-pointer"
      onClick={handleClick}
      onTouchStart={handleDoubleTap}
      role="article"
      aria-label={`${item.title} by ${item.creatorName}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ aspectRatio: item.type === "clip" ? "9/16" : "16/9" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Skeleton shimmer */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(90deg, hsl(var(--card)) 25%, hsl(var(--card)/0.5) 50%, hsl(var(--card)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite" }} />
        )}

        {/* Main thumbnail */}
        {thumbnailUrl && !imgError ? (
          <img
            src={thumbnailUrl}
            srcSet={hasPlaybackId ? `
              https://image.mux.com/${item.playbackId}/thumbnail.jpg?width=320 320w,
              https://image.mux.com/${item.playbackId}/thumbnail.jpg?width=480 480w,
              https://image.mux.com/${item.playbackId}/thumbnail.jpg?width=640 640w
            ` : undefined}
            sizes={hasPlaybackId ? "(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw" : undefined}
            alt={item.title}
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
            className={cn(
              "w-full h-full object-cover transition-transform duration-200 ease-out",
              "group-hover:scale-[1.03]",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          UPLY_LOGO_PLACEHOLDER
        )}

        {/* Animated GIF preview on hover */}
        {showPreview && animatedGifUrl && (
          <img
            src={animatedGifUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-10"
            loading="eager"
          />
        )}

        {/* LIVE badge top-left */}
        {isLive && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF3B3B] text-white text-[11px] font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}

        {/* Duration badge bottom-right */}
        {showDuration && item.durationSeconds > 0 && (
          <div className="absolute bottom-2 right-2 z-20 px-1.5 py-0.5 rounded text-white text-xs font-bold" style={{ background: "rgba(0,0,0,0.8)", fontFamily: "Space Grotesk, sans-serif" }}>
            {item.type === "clip" ? "#SHORTS" : formatDuration(item.durationSeconds)}
          </div>
        )}

        {/* Badge for community/course */}
        {badge && !isLive && (
          <div className="absolute bottom-2 right-2 z-20 px-1.5 py-0.5 rounded text-white text-xs font-bold" style={{ background: "rgba(0,0,0,0.8)", fontFamily: "Space Grotesk, sans-serif" }}>
            {badge}
          </div>
        )}

        {/* Live viewer count bottom-left */}
        {isLive && (
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[11px] font-semibold" style={{ background: "rgba(0,0,0,0.75)" }}>
            <Eye className="w-3 h-3" />
            {formatCount(item.viewerCount)}
          </div>
        )}

        {/* Three-dot menu on hover */}
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
          {showMenu && (
            <div
              className="absolute top-10 right-0 w-40 rounded-lg border border-border bg-card shadow-xl z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { icon: EyeOff, label: "Not Interested" },
                { icon: Bookmark, label: "Save" },
                { icon: Share2, label: "Share" },
                { icon: Flag, label: "Report" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-secondary/50 first:rounded-t-lg last:rounded-b-lg">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Double-tap heart burst */}
        {doubleTapHeart && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <Heart className="w-16 h-16 text-primary fill-primary animate-ping" />
          </div>
        )}

        {/* Live border indicator */}
        {isLive && isLiveSection && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#FF3B3B] z-20" />
        )}
      </div>

      {/* Metadata */}
      <div className="flex gap-2.5 mt-2.5">
        {/* Avatar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/creator/${encodeURIComponent(item.creatorName)}`);
          }}
          className="shrink-0"
        >
          {item.creatorAvatar ? (
            <img
              src={item.creatorAvatar}
              alt=""
              className={cn(
                "w-8 h-8 md:w-9 md:h-9 rounded-full object-cover",
                isLive && "ring-2 ring-[#FF3B3B] animate-pulse"
              )}
              loading="lazy"
            />
          ) : (
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
              {item.creatorName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <h3
            className="text-[13px] md:text-sm font-semibold text-foreground leading-snug"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontFamily: "Plus Jakarta Sans, sans-serif",
            }}
          >
            {item.title}
          </h3>
          <p className="text-xs md:text-[13px] text-muted-foreground mt-0.5 truncate" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {item.creatorName}
            {statText && (
              <>
                <span className="mx-1">·</span>
                {statText}
              </>
            )}
            {!isLive && item.createdAt && (
              <>
                <span className="mx-1">·</span>
                {timeAgo(item.createdAt)}
              </>
            )}
            {isLive && (
              <>
                <span className="mx-1">·</span>
                <span className="text-[#FF3B3B]">Live now</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
});

FeedCard.displayName = "FeedCard";

export default FeedCard;
