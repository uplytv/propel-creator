import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PPVShow } from "../hooks/usePPVShows";

export function PPVShowCard({ show }: { show: PPVShow }) {
  const price = (show.price_cents / 100).toFixed(2);
  return (
    <Link to={`/music/ppv/${show.id}`}>
      <Card className="overflow-hidden bg-card/40 hover:bg-card/60 transition">
        {show.cover_url && (
          <div className="aspect-video bg-muted overflow-hidden">
            <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold truncate">{show.title}</h3>
            <Badge variant={show.status === "live" ? "default" : "secondary"} className="capitalize shrink-0">
              {show.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(show.scheduled_start).toLocaleString()}</span>
            <span className="font-semibold text-foreground">${price}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
