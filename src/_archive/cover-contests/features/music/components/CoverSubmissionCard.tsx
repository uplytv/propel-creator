import { memo } from "react";
import { Heart, Trophy, Star } from "lucide-react";
import {
  useMyCoverLike,
  useToggleCoverLike,
  type CoverSubmission,
} from "../hooks/useCoverContests";

interface Props {
  submission: CoverSubmission;
}

function CoverSubmissionCardImpl({ submission }: Props) {
  const { data: liked } = useMyCoverLike(submission.id);
  const toggle = useToggleCoverLike();

  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      <div className="aspect-video bg-black relative">
        <video
          src={submission.video_url}
          poster={submission.thumbnail_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        />
        {submission.status === "winner" && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-semibold">
            <Trophy className="h-3 w-3" /> Winner
          </span>
        )}
        {submission.status === "finalist" && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-yellow-500/90 text-black px-2 py-0.5 text-xs font-semibold">
            <Star className="h-3 w-3" /> Finalist
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        {submission.caption && (
          <p className="text-sm whitespace-pre-line">{submission.caption}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            by {submission.fan_id.slice(0, 8)}
          </span>
          <button
            type="button"
            onClick={() => toggle.mutate({ submission_id: submission.id, on: !liked })}
            className={`min-h-[36px] inline-flex items-center gap-1 px-2 rounded-lg text-sm ${
              liked ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
            aria-label="Like cover"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {submission.like_count}
          </button>
        </div>
      </div>
    </div>
  );
}

export const CoverSubmissionCard = memo(CoverSubmissionCardImpl);
