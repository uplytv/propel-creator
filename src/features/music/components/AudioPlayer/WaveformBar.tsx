import { useMemo } from 'react';
import { usePlayerStore } from '../../hooks/usePlayerStore';

/**
 * Lightweight waveform: uses real `peaks` if provided (from
 * tracks.waveform_peaks), otherwise falls back to a deterministic
 * pseudo-waveform derived from the trackId so the UI never looks empty.
 */
export default function WaveformBar({
  trackId,
  peaks,
}: {
  trackId: string;
  peaks?: number[] | null;
}) {
  const position = usePlayerStore((s) => s.positionSeconds);
  const duration = usePlayerStore((s) => s.durationSeconds);
  const seek = usePlayerStore((s) => s.seek);

  const bars = useMemo(() => {
    if (peaks && peaks.length > 0) {
      return peaks.map((p) => Math.max(0.05, Math.min(1, p)));
    }
    let seed = 0;
    for (let i = 0; i < trackId.length; i++) seed = (seed * 31 + trackId.charCodeAt(i)) >>> 0;
    return Array.from({ length: 60 }, () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return 0.25 + (seed % 1000) / 1333;
    });
  }, [trackId, peaks]);

  const progress = duration > 0 ? position / duration : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;
    if (duration > 0) seek(ratio * duration);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-end gap-[2px] h-10 cursor-pointer select-none"
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.max(1, Math.round(duration))}
      aria-valuenow={Math.round(position)}
    >
      {bars.map((h, i) => {
        const reached = i / bars.length <= progress;
        return (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: `${h * 100}%`,
              background: reached ? '#3D7CFF' : 'rgba(255,255,255,0.18)',
            }}
          />
        );
      })}
    </div>
  );
}
