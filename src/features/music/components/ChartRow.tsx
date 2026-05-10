import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ChartEntry } from "../hooks/useMusicCharts";

export function ChartRow({ entry }: { entry: ChartEntry }) {
  const delta =
    entry.prev_rank == null ? null : entry.prev_rank - entry.rank;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card/40 border border-border/40">
      <div className="w-8 text-center font-bold text-lg text-foreground">
        {entry.rank}
      </div>
      {entry.item_image_url ? (
        <img
          src={entry.item_image_url}
          alt={entry.item_title ?? "chart item"}
          className="w-12 h-12 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {entry.item_title ?? "Untitled"}
        </div>
        {entry.item_subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {entry.item_subtitle}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs">
        {delta == null ? (
          <span className="text-muted-foreground">NEW</span>
        ) : delta > 0 ? (
          <>
            <ArrowUp className="w-3 h-3 text-primary" />
            <span className="text-primary">{delta}</span>
          </>
        ) : delta < 0 ? (
          <>
            <ArrowDown className="w-3 h-3 text-destructive" />
            <span className="text-destructive">{Math.abs(delta)}</span>
          </>
        ) : (
          <Minus className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
