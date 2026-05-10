import { Link } from "react-router-dom";
import { Disc3 } from "lucide-react";
import type { MusicDrop } from "../hooks/useMusicDrops";

interface Props {
  drop: MusicDrop;
}

export function DropCard({ drop }: Props) {
  const remaining = drop.edition_cap - drop.editions_sold;
  const pct = Math.min(100, Math.round((drop.editions_sold / Math.max(1, drop.edition_cap)) * 100));
  const soldOut = drop.status === "sold_out" || remaining <= 0;
  const price = drop.price_cents > 0 ? `$${(drop.price_cents / 100).toFixed(2)}` : "Free";

  return (
    <Link
      to={`/music/drops/${drop.id}`}
      className="group block rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/40 transition-colors"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {drop.artwork_url ? (
          <img
            src={drop.artwork_url}
            alt={drop.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc3 className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-wide">
              Sold Out
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-[11px] font-semibold text-foreground">
          {price}
        </div>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{drop.title}</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{drop.editions_sold}/{drop.edition_cap} claimed</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
