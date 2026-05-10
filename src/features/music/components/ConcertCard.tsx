import { Link } from "react-router-dom";
import { Calendar, Ticket } from "lucide-react";
import type { Concert } from "../hooks/useConcerts";

export function ConcertCard({ concert }: { concert: Concert }) {
  const date = new Date(concert.starts_at);
  return (
    <Link
      to={`/music/concerts/${concert.id}`}
      className="block rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors"
    >
      <div className="aspect-video bg-muted relative">
        {concert.cover_url && (
          <img src={concert.cover_url} alt={concert.title} className="w-full h-full object-cover" loading="lazy" />
        )}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-semibold">
          LIVE
        </div>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold line-clamp-1">{concert.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {date.toLocaleString()}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Ticket className="h-4 w-4 text-primary" />
          {concert.ticket_price_cents === 0
            ? "Free"
            : `$${(concert.ticket_price_cents / 100).toFixed(2)}`}
        </div>
      </div>
    </Link>
  );
}
