import { useParams } from "react-router-dom";
import { Loader2, Play, Pause, SkipForward, Heart, Radio } from "lucide-react";
import { useFanStation, useFanRadioEngine } from "../hooks/useFanRadio";

export default function FanRadioPlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: station, isLoading } = useFanStation(slug);
  const { current, queue, index, isPlaying, play, pause, next, like } = useFanRadioEngine(station?.id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!station) {
    return <div className="p-6 text-center text-muted-foreground">Station not found.</div>;
  }

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <Radio className="w-3.5 h-3.5" /> Station
        </div>
        <h1 className="text-2xl font-bold text-foreground">{station.name}</h1>
        {station.description && (
          <p className="text-sm text-muted-foreground">{station.description}</p>
        )}
      </header>

      <div className="rounded-3xl overflow-hidden bg-card border border-border">
        <div className="relative aspect-square bg-muted">
          {(current?.artwork_url || station.artwork_url) ? (
            <img
              src={current?.artwork_url ?? station.artwork_url ?? ""}
              alt={current?.title ?? station.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Radio className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-base font-semibold text-foreground line-clamp-1">
              {current?.title ?? "Loading…"}
            </div>
            {current?.artist && (
              <div className="text-xs text-muted-foreground">{current.artist}</div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={like}
              disabled={!current}
              className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center disabled:opacity-40"
              aria-label="Like"
            >
              <Heart className="w-5 h-5" />
            </button>
            <button
              onClick={isPlaying ? pause : play}
              disabled={!current}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shadow-lg shadow-primary/30"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
            </button>
            <button
              onClick={next}
              disabled={!current}
              className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center disabled:opacity-40"
              aria-label="Skip"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Track {index + 1} of {queue?.length ?? 0} · Personalized for you
          </p>
        </div>
      </div>

      {queue && queue.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground px-1 mb-2">Up next</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {queue.slice(index + 1, index + 6).map((t, i) => (
              <div key={t.id} className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                  {t.artwork_url && <img src={t.artwork_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{t.title}</div>
                  {t.artist && <div className="text-[11px] text-muted-foreground truncate">{t.artist}</div>}
                </div>
                <div className="text-[10px] text-muted-foreground">#{i + 2}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
