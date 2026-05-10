import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMySpotlightLikes,
  useToggleSpotlightLike,
  type FanSpotlightSubmission,
} from "../hooks/useFanSpotlights";

interface Props {
  submission: FanSpotlightSubmission;
}

export function FanSpotlightSubmissionCard({ submission }: Props) {
  const { data: likedIds = [] } = useMySpotlightLikes(submission.spotlight_id);
  const toggle = useToggleSpotlightLike();
  const liked = likedIds.includes(submission.id);
  const isImage = submission.media_type === "art";
  const isVideo = submission.media_type === "video";

  return (
    <Card className="overflow-hidden">
      {isImage && (
        <img src={submission.media_url} alt={submission.title ?? ""} className="w-full aspect-video object-cover" />
      )}
      {isVideo && (
        <video src={submission.media_url} controls className="w-full aspect-video bg-black" />
      )}
      {!isImage && !isVideo && (
        <audio src={submission.media_url} controls className="w-full" />
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {submission.title && <p className="font-medium truncate">{submission.title}</p>}
              {submission.is_featured && (
                <Badge className="gap-1"><Star className="h-3 w-3" />Featured</Badge>
              )}
            </div>
            <Badge variant="outline" className="capitalize mt-1">{submission.media_type}</Badge>
          </div>
          <Button
            size="sm"
            variant={liked ? "default" : "outline"}
            onClick={() => toggle.mutate({
              submission_id: submission.id,
              spotlight_id: submission.spotlight_id,
              liked,
            })}
            className="min-h-11 min-w-11 gap-1"
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span className="tabular-nums">{submission.like_count}</span>
          </Button>
        </div>
        {submission.caption && (
          <p className="text-sm text-muted-foreground line-clamp-3">{submission.caption}</p>
        )}
      </div>
    </Card>
  );
}
