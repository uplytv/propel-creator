import { useEffect, useMemo, useRef } from 'react';
import { useLyrics, parseLrc } from '../../hooks/useLyrics';
import { usePlayerStore } from '../../hooks/usePlayerStore';

export default function LyricsPanel({ trackId }: { trackId: string }) {
  const { data, isLoading } = useLyrics(trackId);
  const position = usePlayerStore((s) => s.positionSeconds);
  const seek = usePlayerStore((s) => s.seek);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const lrcLines = useMemo(
    () => (data?.lrc_text ? parseLrc(data.lrc_text) : []),
    [data?.lrc_text]
  );
  const isSynced = lrcLines.length > 0;

  const activeIdx = useMemo(() => {
    if (!isSynced) return -1;
    let i = 0;
    for (let j = 0; j < lrcLines.length; j++) {
      if (lrcLines[j].time <= position) i = j;
      else break;
    }
    return i;
  }, [lrcLines, position, isSynced]);

  // auto-scroll active line into view
  useEffect(() => {
    if (!isSynced || activeIdx < 0) return;
    const el = containerRef.current?.querySelector<HTMLDivElement>(
      `[data-line="${activeIdx}"]`
    );
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx, isSynced]);

  if (isLoading) {
    return <div className="text-white/50 text-sm py-8 text-center">Loading lyrics…</div>;
  }
  if (!data || (!data.lyrics_text && !data.lrc_text)) {
    return (
      <div className="text-white/50 text-sm py-12 text-center px-6">
        No lyrics yet. The artist can add them from the track page.
      </div>
    );
  }

  if (isSynced) {
    return (
      <div
        ref={containerRef}
        className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3 text-center"
      >
        {lrcLines.map((line, i) => (
          <div
            key={i}
            data-line={i}
            onClick={() => seek(line.time)}
            className={`cursor-pointer transition-all ${
              i === activeIdx
                ? 'text-white text-2xl font-bold'
                : 'text-white/40 text-lg'
            }`}
          >
            {line.text || '♪'}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto px-6 py-4 whitespace-pre-wrap text-white/85 text-base leading-relaxed">
      {data.lyrics_text}
    </div>
  );
}
