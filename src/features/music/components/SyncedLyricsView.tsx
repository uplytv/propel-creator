import { useEffect, useMemo, useRef } from 'react';
import { parseLrc } from '../hooks/useLyrics';
import { cn } from '@/lib/utils';

interface Props {
  lrcText: string | null | undefined;
  plainText?: string | null;
  currentTime: number;
  onSeek?: (seconds: number) => void;
  karaoke?: boolean;
}

export function SyncedLyricsView({ lrcText, plainText, currentTime, onSeek, karaoke }: Props) {
  const lines = useMemo(() => (lrcText ? parseLrc(lrcText) : []), [lrcText]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIdx = useMemo(() => {
    if (!lines.length) return -1;
    let i = 0;
    while (i < lines.length && lines[i].time <= currentTime) i++;
    return i - 1;
  }, [lines, currentTime]);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx]);

  if (!lines.length) {
    return (
      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {plainText || 'No lyrics available yet.'}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-h-[60vh] overflow-y-auto space-y-3 py-8 text-center">
      {lines.map((l, i) => {
        const active = i === activeIdx;
        const past = i < activeIdx;
        return (
          <button
            key={i}
            data-idx={i}
            onClick={() => onSeek?.(l.time)}
            className={cn(
              'block w-full px-4 py-1 text-base font-semibold transition-all duration-300',
              active && karaoke && 'text-2xl text-primary scale-105 drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]',
              active && !karaoke && 'text-xl text-foreground',
              !active && past && 'text-muted-foreground/50',
              !active && !past && 'text-muted-foreground',
            )}
          >
            {l.text || '♪'}
          </button>
        );
      })}
    </div>
  );
}
