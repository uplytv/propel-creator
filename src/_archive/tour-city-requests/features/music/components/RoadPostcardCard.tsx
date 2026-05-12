import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { RoadPostcard } from "../hooks/useRoadPostcards";
import { useTogglePostcardLike } from "../hooks/useRoadPostcards";

const MOOD_EMOJI: Record<string, string> = {
  hyped: "🔥",
  tired: "😴",
  grateful: "🙏",
  homesick: "🏠",
  curious: "👀",
  party: "🎉",
};

interface Props {
  postcard: RoadPostcard;
  liked: boolean;
}

export function RoadPostcardCard({ postcard, liked }: Props) {
  const toggle = useTogglePostcardLike();

  return (
    <Card className="overflow-hidden">
      {postcard.image_url && (
        <div className="aspect-[3/2] bg-muted overflow-hidden">
          <img
            src={postcard.image_url}
            alt={postcard.city}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold">
              {postcard.city}
              {postcard.country ? `, ${postcard.country}` : ""}
            </span>
          </div>
          {postcard.mood && (
            <Badge variant="secondary" className="capitalize">
              {MOOD_EMOJI[postcard.mood] ?? ""} {postcard.mood}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {format(new Date(postcard.postcard_date), "MMM d, yyyy")}
        </div>
        <p className="text-sm whitespace-pre-wrap">{postcard.message}</p>
        <div className="pt-1">
          <Button
            size="sm"
            variant={liked ? "default" : "outline"}
            className="gap-1 min-h-11"
            disabled={toggle.isPending}
            onClick={() =>
              toggle.mutate({
                postcard_id: postcard.id,
                artist_id: postcard.artist_id,
                liked,
              })
            }
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            {postcard.like_count}
          </Button>
        </div>
      </div>
    </Card>
  );
}
