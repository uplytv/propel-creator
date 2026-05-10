import { useMemo, useEffect, useRef } from "react";
import type { SyncedLine } from "../hooks/useLyrics";

interface LyricsKaraokeProps {
  lines: SyncedLine[];
  /** current playback time in seconds */
  currentTime: number;
  className?: string;
}

export function LyricsKaraoke({ lines, currentTime, className }: LyricsKaraokeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].t <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lines, currentTime]);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-line="${activeIndex}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  if (!lines.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No synced lyrics available.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`max-h-[60vh] overflow-y-auto space-y-3 px-4 py-6 text-center ${className ?? ""}`}
    >
      {lines.map((line, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        return (
          <p
            key={i}
            data-line={i}
            className={`transition-all duration-300 ${
              isActive
                ? "text-primary text-2xl font-bold scale-105"
                : isPast
                  ? "text-muted-foreground/60 text-base"
                  : "text-foreground/80 text-base"
            }`}
          >
            {line.text}
          </p>
        );
      })}
    </div>
  );
}
