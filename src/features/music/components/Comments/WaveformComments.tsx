import { useTrackComments } from '../../hooks/useTrackComments';
import { usePlayerStore } from '../../hooks/usePlayerStore';

export default function WaveformComments({ trackId }: { trackId: string }) {
  const { data: comments = [] } = useTrackComments(trackId);
  const duration = usePlayerStore((s) => s.durationSeconds);
  const seek = usePlayerStore((s) => s.seek);

  if (!duration || duration <= 0) return null;

  const anchored = comments.filter((c) => typeof c.timestamp_seconds === 'number');

  return (
    <div className="pointer-events-none absolute inset-0">
      {anchored.map((c) => {
        const pct = Math.min(100, Math.max(0, ((c.timestamp_seconds ?? 0) / duration) * 100));
        const ts = Math.round(c.timestamp_seconds ?? 0);
        const m = Math.floor(ts / 60);
        const s = (ts % 60).toString().padStart(2, '0');
        return (
          <div
            key={c.id}
            className="pointer-events-auto absolute -top-3 -translate-x-1/2 group"
            style={{ left: `${pct}%` }}
          >
            <button
              onClick={() => seek(c.timestamp_seconds ?? 0)}
              className="w-4 h-4 rounded-full ring-2 ring-black overflow-hidden bg-white/20"
              aria-label={`Comment at ${m}:${s}`}
              style={{
                background: c.profile?.avatar_url
                  ? `url(${c.profile.avatar_url}) center/cover`
                  : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
              }}
            />
            <div className="hidden group-hover:block absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-black/95 border border-white/10 shadow-xl text-left">
              <div className="flex items-center gap-2 text-[10px] text-white/60 mb-1">
                <span className="text-white font-semibold">
                  @{c.profile?.username ?? 'user'}
                </span>
                <span className="text-[#3D7CFF]">{m}:{s}</span>
              </div>
              <div className="text-xs text-white/90 break-words">{c.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
