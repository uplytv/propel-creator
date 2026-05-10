import { Link } from "react-router-dom";
import { Music2, Tag } from "lucide-react";
import type { SamplePack } from "../hooks/useSampleMarketplace";

interface Props {
  pack: SamplePack;
}

export function SamplePackCard({ pack }: Props) {
  const price = pack.price_cents > 0
    ? `$${(pack.price_cents / 100).toFixed(2)}`
    : "Free";

  return (
    <Link
      to={`/music/samples/${pack.id}`}
      className="group block rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/40 transition-colors"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {pack.cover_url ? (
          <img
            src={pack.cover_url}
            alt={pack.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-semibold text-foreground">
          {price}
        </div>
        {pack.bpm && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-[10px] font-medium text-foreground">
            {pack.bpm} BPM{pack.music_key ? ` · ${pack.music_key}` : ""}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">
          {pack.title}
        </h3>
        {pack.genre && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Tag className="w-3 h-3" />
            <span className="capitalize">{pack.genre}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
