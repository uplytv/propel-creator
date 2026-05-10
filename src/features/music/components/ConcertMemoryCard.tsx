import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Calendar, Camera, Video } from "lucide-react";
import { useMyMemoryLikes, useToggleMemoryLike, type ConcertMemory } from "../hooks/useConcertMemories";

interface Props {
  memory: ConcertMemory;
}

export function ConcertMemoryCard({ memory }: Props) {
  const { data: likes } = useMyMemoryLikes(memory.artist_id);
  const toggle = useToggleMemoryLike();
  const liked = likes?.has(memory.id) ?? false;

  return (
    <Card className="bg-card/40 border-border/50 overflow-hidden">
      <div className="aspect-square w-full bg-muted overflow-hidden">
        {memory.media_type === "video" ? (
          <video
            src={memory.media_url}
            className="w-full h-full object-cover"
            controls
            playsInline
          />
        ) : (
          <img
            src={memory.media_url}
            alt={memory.caption ?? "Concert memory"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {memory.media_type === "video" ? (
              <Video className="w-3 h-3 mr-1" />
            ) : (
              <Camera className="w-3 h-3 mr-1" />
            )}
            {memory.media_type}
          </Badge>
          {memory.concert_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(memory.concert_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {memory.caption && <p className="text-sm line-clamp-2">{memory.caption}</p>}

        {(memory.venue || memory.city) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">
              {[memory.venue, memory.city].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full min-h-[44px]"
          onClick={() =>
            toggle.mutate({ memory_id: memory.id, artist_id: memory.artist_id, liked })
          }
          disabled={toggle.isPending}
        >
          <Heart className={`w-4 h-4 mr-2 ${liked ? "fill-primary text-primary" : ""}`} />
          {memory.like_count}
        </Button>
      </CardContent>
    </Card>
  );
}
