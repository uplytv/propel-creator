import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, Play } from "lucide-react";
import LiveBadge from "./LiveBadge";
import { useLiveViewerCount } from "@/hooks/useLiveViewerCount";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

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
        {!isStream && item.is_new_creator_boosted && (
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
