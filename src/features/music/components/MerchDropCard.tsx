import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Flame } from "lucide-react";
import type { MerchDrop } from "../hooks/useMerchDrops";

interface Props {
  drop: MerchDrop;
  onClick?: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const STATUS_VARIANT: Record<MerchDrop["status"], { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", cls: "bg-primary/20 text-primary" },
  live: { label: "Live", cls: "bg-primary text-primary-foreground" },
  sold_out: { label: "Sold Out", cls: "bg-destructive/20 text-destructive" },
  ended: { label: "Ended", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
};

export function MerchDropCard({ drop, onClick }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const launchMs = new Date(drop.launch_at).getTime() - now;
  const stockPct = drop.stock_total
    ? Math.round((drop.stock_remaining / drop.stock_total) * 100)
    : 0;
  const lowStock = drop.stock_total > 0 && stockPct <= 20 && drop.status === "live";
  const variant = STATUS_VARIANT[drop.status];

  return (
    <Card
      className="bg-card/40 border-border/50 overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      {drop.image_url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={drop.image_url}
            alt={drop.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold truncate">{drop.title}</h3>
          </div>
          <Badge className={variant.cls}>{variant.label}</Badge>
        </div>

        {drop.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{drop.description}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">${(drop.price_cents / 100).toFixed(2)}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {drop.status === "scheduled" ? formatCountdown(launchMs) : variant.label}
          </span>
        </div>

        {drop.stock_total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {drop.stock_remaining} / {drop.stock_total} left
              </span>
              {lowStock && (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <Flame className="w-3 h-3" /> Low stock
                </span>
              )}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${lowStock ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
