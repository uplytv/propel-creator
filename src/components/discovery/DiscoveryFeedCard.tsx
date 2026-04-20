import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, Play } from "lucide-react";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

function linkFor(item: DiscoveryItem) {
  if (item.content_type === "video") return `/videos/${item.slug || item.content_id}`;
  if (item.content_type === "clip") return `/clips/${item.slug || item.content_id}`;
  return `/stream/${item.slug || item.content_id}?type=recording`;
}

export default function DiscoveryFeedCard({ item }: { item: DiscoveryItem }) {
  return (
    <Link to={linkFor(item)} className="group block space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground"><Play className="w-8 h-8" /></div>
        )}
        {item.is_new_creator_boosted && (
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
            {item.creator?.display_name ?? "Creator"} · <Eye className="inline w-3 h-3" /> {item.views.toLocaleString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
