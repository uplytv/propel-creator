import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, Play, Rocket } from "lucide-react";
import LiveBadge from "./LiveBadge";
import { useLiveViewerCount } from "@/hooks/useLiveViewerCount";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

/** Re-renders the consumer once per minute, aligned to wall-clock minute. */
function useMinuteTick(enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      setTick((t) => t + 1);
      interval = setInterval(() => setTick((t) => t + 1), 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);
}

function linkFor(item: DiscoveryItem) {
  const slug = item.slug || item.content_id;
  switch (item.content_type) {
    case "video": return `/videos/${slug}`;
    case "clip": return `/clips/${slug}`;
    case "stream": return `/stream/${slug}`;
    case "recording": return `/stream/${slug}?type=recording`;
    case "post": return `/community/${item.creator_id}?post=${item.content_id}`;
    case "product": return `/products/${item.content_id}`;
    case "podcast": return `/podcast?episode=${item.content_id}`;
    case "event": return `/events/global/${item.content_id}`;
    default: return `/stream/${slug}`;
  }
}

function formatBoostRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "ending";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export default function DiscoveryFeedCard({ item }: { item: DiscoveryItem }) {
  // Subscribe to live viewer count only when the item is a live stream
  const isStream = item.content_type === "stream" && item.is_live;
  const { count: liveCount } = useLiveViewerCount(isStream ? item.content_id : null, item.views);

  return (
    <Link to={linkFor(item)} className="group block space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground"><Play className="w-8 h-8" /></div>
        )}

        {isStream && (
          <LiveBadge count={liveCount} className="absolute top-2 left-2" />
        )}
        {!isStream && item.is_boosted && (
          <Badge
            className="absolute top-2 left-2 bg-primary text-primary-foreground gap-1 shadow-lg"
            title={item.boost_expires_at ? `Boost ends ${new Date(item.boost_expires_at).toLocaleString()}` : undefined}
          >
            <Rocket className="w-3 h-3" />
            <span>Promoted</span>
            {item.boost_expires_at && (
              <span className="opacity-80 font-normal">· {formatBoostRemaining(item.boost_expires_at)}</span>
            )}
          </Badge>
        )}
        {!isStream && !item.is_boosted && item.is_new_creator_boosted && (
          <Badge className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm gap-1">
            <Sparkles className="w-3 h-3" /> Rising
          </Badge>
        )}
        {item.duration_seconds ? (
          <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
            {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2.5">
        <Avatar className="w-8 h-8">
          <AvatarImage src={item.creator?.avatar_url ?? undefined} />
          <AvatarFallback>{item.creator?.display_name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary">{item.title}</h3>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.creator?.display_name ?? "Creator"} · <Eye className="inline w-3 h-3" />{" "}
            {(isStream ? liveCount : item.views).toLocaleString()}
            {isStream ? " watching" : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}
