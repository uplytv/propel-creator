import { memo } from "react";
import { Link } from "react-router-dom";
import { Disc3, Package, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type VinylDrop } from "../hooks/useVinylDrops";

interface Props {
  drop: VinylDrop;
  to?: string;
}

const STATUS_LABEL: Record<VinylDrop["status"], string> = {
  draft: "Draft",
  announced: "Announced",
  preorder: "Pre-order",
  shipped: "Shipped",
  soldout: "Sold Out",
};

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function VinylDropCardImpl({ drop, to }: Props) {
  const href = to ?? `/music/vinyl/${drop.id}`;
  const pct = drop.edition_size > 0 ? Math.min(100, Math.round((drop.reserved_count / drop.edition_size) * 100)) : 0;
  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-2xl border border-border bg-card/50 transition hover:border-primary/40"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {drop.cover_url ? (
          <img
            src={drop.cover_url}
            alt={drop.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Disc3 className="h-12 w-12" aria-hidden />
          </div>
        )}
        <Badge
          variant={drop.status === "soldout" ? "destructive" : "secondary"}
          className="absolute left-2 top-2 text-[10px]"
        >
          {STATUS_LABEL[drop.status]}
        </Badge>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{drop.title}</h3>
          <span className="shrink-0 text-sm font-semibold text-primary">
            {formatPrice(drop.price_cents, drop.currency)}
          </span>
        </div>
        {drop.color && (
          <p className="text-xs text-muted-foreground">{drop.color}</p>
        )}
        {drop.edition_size > 0 && (
          <div className="space-y-1">
            <Progress value={pct} className="h-1.5" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Package className="h-3 w-3" aria-hidden />
                {drop.reserved_count}/{drop.edition_size}
              </span>
              {drop.ships_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden />
                  {new Date(drop.ships_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export const VinylDropCard = memo(VinylDropCardImpl);
