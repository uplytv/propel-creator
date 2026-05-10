import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Play, MessageSquare } from "lucide-react";
import { useRecordDemoPlay, type FanDemoSubmission } from "../hooks/useFanDemos";

interface Props {
  demo: FanDemoSubmission;
  showArtistActions?: boolean;
  onReview?: (demo: FanDemoSubmission) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  reviewed: "outline",
  featured: "default",
  declined: "destructive",
};

export const FanDemoCard = memo(function FanDemoCard({ demo, showArtistActions, onReview }: Props) {
  const recordPlay = useRecordDemoPlay();

  return (
    <Card className="p-4 space-y-3 bg-card border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Music className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-foreground truncate">{demo.title}</h4>
            {demo.genre && (
              <p className="text-xs text-muted-foreground">{demo.genre}</p>
            )}
          </div>
        </div>
        <Badge variant={statusVariant[demo.status] ?? "secondary"} className="capitalize shrink-0">
          {demo.status}
        </Badge>
      </div>

      {demo.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">{demo.description}</p>
      )}

      <audio
        controls
        src={demo.audio_url}
        className="w-full"
        onPlay={() => recordPlay.mutate(demo.id)}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Play className="h-3.5 w-3.5" />
          {demo.play_count} plays
        </span>
        {showArtistActions && onReview && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onReview(demo)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Review
          </Button>
        )}
      </div>

      {demo.artist_feedback && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground mb-1">Artist feedback</p>
          <p className="text-foreground">{demo.artist_feedback}</p>
        </div>
      )}
    </Card>
  );
});
