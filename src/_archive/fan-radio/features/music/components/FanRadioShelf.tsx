import { Link } from "react-router-dom";
import { Loader2, Radio } from "lucide-react";
import { useFanStations } from "../hooks/useFanRadio";

export function FanRadioShelf() {
  const { data: stations, isLoading } = useFanStations();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!stations || stations.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No stations live yet.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Radio className="w-4 h-4" /> Fan Radio
        </h2>
        <Link to="/music/radio" className="text-xs text-primary font-medium">View all</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {stations.slice(0, 8).map((s) => (
          <Link
            key={s.id}
            to={`/music/radio/${s.slug}`}
            className="group rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="aspect-square bg-muted overflow-hidden relative">
              {s.artwork_url ? (
                <img src={s.artwork_url} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Radio className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              {s.is_featured && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">Featured</span>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-foreground line-clamp-1">{s.name}</h3>
              {s.mood && <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{s.mood}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
