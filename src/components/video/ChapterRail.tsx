import { useVideoChapters } from "@/hooks/useVideoChapters";
import { ListVideo } from "lucide-react";

interface Props {
  videoId?: string;
  currentTime?: number;
  onSeek?: (seconds: number) => void;
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ChapterRail({ videoId, currentTime = 0, onSeek }: Props) {
  const { data: chapters } = useVideoChapters(videoId);
  if (!chapters || chapters.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
        <ListVideo className="w-4 h-4" /> Chapters
      </h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {chapters.map((c, i) => {
          const next = chapters[i + 1]?.start_seconds ?? Infinity;
          const isActive = currentTime >= c.start_seconds && currentTime < next;
          return (
            <button
              key={c.id}
              onClick={() => onSeek?.(c.start_seconds)}
              className={`shrink-0 min-w-[140px] max-w-[180px] text-left rounded-lg p-2.5 border transition-all ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40 hover:border-primary/40"
              }`}
            >
              <p className="text-[10px] font-mono text-muted-foreground">{fmt(c.start_seconds)}</p>
              <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug mt-0.5 break-words">
                {c.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
