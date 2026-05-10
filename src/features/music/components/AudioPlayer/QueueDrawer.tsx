import { X, GripVertical, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { formatDuration } from '../../lib/formatDuration';

export default function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playAt = usePlayerStore((s) => s.playAt);
  const removeAt = usePlayerStore((s) => s.removeAt);
  const moveQueueItem = usePlayerStore((s) => s.moveQueueItem);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  if (!open) return null;

  const upNext = queue.slice(currentIndex + 1);
  const current = queue[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-label="Up next">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close queue"
      />
      <div
        className="relative w-full sm:max-w-md bg-[#0A0A0A] border-l border-white/10 flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Queue</h2>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs text-white/60 hover:text-white px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {current && (
            <section className="px-4 pt-4">
              <h3 className="text-[11px] uppercase tracking-wide text-white/40 mb-2">
                Now playing
              </h3>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div
                  className="w-10 h-10 rounded-md flex-shrink-0"
                  style={{
                    background: current.cover_art_url
                      ? `url(${current.cover_art_url}) center/cover`
                      : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{current.title}</div>
                  <div className="text-xs text-white/50 truncate">{current.genre || 'Music'}</div>
                </div>
                <span className="text-xs text-white/40">
                  {formatDuration(current.duration_seconds)}
                </span>
              </div>
            </section>
          )}

          <section className="px-4 py-4">
            <h3 className="text-[11px] uppercase tracking-wide text-white/40 mb-2">Up next</h3>
            {!upNext.length && (
              <p className="text-sm text-white/40">Nothing queued. Play an album to start.</p>
            )}
            <div className="space-y-1">
              {upNext.map((t, i) => {
                const realIdx = currentIndex + 1 + i;
                return (
                  <div
                    key={`${t.id}-${realIdx}`}
                    className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white/5"
                  >
                    <button
                      aria-label="Move up"
                      onClick={() =>
                        realIdx > currentIndex + 1 && moveQueueItem(realIdx, realIdx - 1)
                      }
                      className="p-1 text-white/30 hover:text-white/70"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => playAt(realIdx)}
                      className="flex-1 flex items-center gap-3 min-w-0 text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-md flex-shrink-0"
                        style={{
                          background: t.cover_art_url
                            ? `url(${t.cover_art_url}) center/cover`
                            : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{t.title}</div>
                        <div className="text-xs text-white/50 truncate">
                          {t.genre || 'Music'}
                        </div>
                      </div>
                      <span className="text-xs text-white/40">
                        {formatDuration(t.duration_seconds)}
                      </span>
                    </button>
                    <button
                      onClick={() => removeAt(realIdx)}
                      aria-label="Remove from queue"
                      className="p-1 text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
