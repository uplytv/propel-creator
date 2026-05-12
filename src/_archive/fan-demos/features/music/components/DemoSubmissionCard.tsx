import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, Check, X, Headphones } from "lucide-react";
import { useReviewDemo, type DemoSubmission } from "../hooks/useDemoInbox";

interface Props {
  demo: DemoSubmission;
  isArtist?: boolean;
}

const STATUS_CLS: Record<DemoSubmission["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  listened: "bg-primary/20 text-primary",
  shortlisted: "bg-primary text-primary-foreground",
  passed: "bg-destructive/20 text-destructive",
};

export function DemoSubmissionCard({ demo, isArtist }: Props) {
  const review = useReviewDemo();

  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{demo.title}</h3>
            {demo.genre && (
              <span className="text-xs text-muted-foreground">{demo.genre}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {demo.is_featured && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" /> Featured
              </Badge>
            )}
            <Badge className={STATUS_CLS[demo.status]}>{demo.status}</Badge>
          </div>
        </div>

        {demo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{demo.description}</p>
        )}

        <audio src={demo.audio_url} controls preload="metadata" className="w-full" />

        {demo.feedback && (
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <div className="font-medium mb-1 flex items-center gap-1">
              <Headphones className="w-3 h-3" /> Artist feedback
              {demo.rating ? (
                <span className="ml-auto flex items-center">
                  {Array.from({ length: demo.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                  ))}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{demo.feedback}</p>
          </div>
        )}

        {isArtist && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => review.mutate({ id: demo.id, status: "listened" })}
              disabled={review.isPending}
            >
              <Headphones className="w-4 h-4 mr-1" /> Heard
            </Button>
            <Button
              size="sm"
              className="min-h-[44px]"
              onClick={() =>
                review.mutate({ id: demo.id, status: "shortlisted" })
              }
              disabled={review.isPending}
            >
              <Check className="w-4 h-4 mr-1" /> Shortlist
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => review.mutate({ id: demo.id, status: "passed" })}
              disabled={review.isPending}
            >
              <X className="w-4 h-4 mr-1" /> Pass
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
