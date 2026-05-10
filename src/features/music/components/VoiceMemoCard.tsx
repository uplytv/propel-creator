import { memo, useState } from "react";
import { Heart, MessageCircle, Mic, Pause, Play } from "lucide-react";

interface Props {
  memo: {
    id: string;
    audio_url: string;
    caption?: string | null;
    duration_seconds?: number | null;
    like_count: number;
    reply_count: number;
    created_at: string;
  };
  liked?: boolean;
  onToggleLike?: () => void;
  onOpenReplies?: () => void;
}

function VoiceMemoCardImpl({ memo: m, liked, onToggleLike, onOpenReplies }: Props) {
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const toggle = () => {
    let el = audio;
    if (!el) {
      el = new Audio(m.audio_url);
      el.onended = () => setPlaying(false);
      setAudio(el);
    }
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const dur = m.duration_seconds ?? 0;
  const mins = Math.floor(dur / 60);
  const secs = String(dur % 60).padStart(2, "0");

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-primary text-primary-foreground"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Mic className="h-3 w-3" />
            Voice memo
            {dur > 0 && <span className="ml-auto">{mins}:{secs}</span>}
          </div>
          {m.caption && (
            <p className="text-sm mt-1 whitespace-pre-line line-clamp-3">{m.caption}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLike}
          className={`flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border ${
            liked ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
          }`}
          aria-label="Like memo"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          <span className="text-xs font-semibold">{m.like_count}</span>
        </button>
        <button
          type="button"
          onClick={onOpenReplies}
          className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-border text-muted-foreground"
          aria-label="View replies"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-semibold">{m.reply_count}</span>
        </button>
      </div>
    </div>
  );
}

export const VoiceMemoCard = memo(VoiceMemoCardImpl);
