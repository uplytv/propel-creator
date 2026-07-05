import { Link } from "react-router-dom";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface GlobalEvent {
  id: string;
  title: string;
  date: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  image_url: string | null;
  ticket_url: string | null;
  artist_name: string | null;
  is_persian: boolean;
  source: string;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "TBA";
  try {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "TBA";
  }
};

export function GlobalEventCard({ event }: { event: GlobalEvent }) {
  const d = event.date ? new Date(event.date) : null;
  const valid = !!d && !isNaN(d.getTime());

  return (
    <div className="group">
      <Link to={`/events/global/${event.id}`} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Calendar className="w-10 h-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          {valid && (
            <div className="absolute top-2 left-2 flex flex-col items-center justify-center bg-background/90 backdrop-blur rounded-md w-11 py-1 text-center leading-none">
              <span className="text-[9px] font-bold uppercase text-primary">{d!.toLocaleDateString("en-US", { month: "short" })}</span>
              <span className="text-base font-extrabold text-foreground">{d!.getDate()}</span>
            </div>
          )}

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {event.is_persian && <Badge className="bg-primary text-primary-foreground text-[10px]">🇮🇷 Persian</Badge>}
            {event.category && <Badge variant="secondary" className="capitalize text-[10px]">{event.category}</Badge>}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow">{event.title}</h3>
            {(event.venue || event.city) && (
              <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{[event.venue, event.city, event.country].filter(Boolean).join(" · ")}</span>
              </p>
            )}
          </div>
        </div>
      </Link>

      <div className="pt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground truncate">{event.artist_name || formatDate(event.date)}</span>
        {event.ticket_url && (
          <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Ticket className="w-3 h-3 mr-1" /> Tickets
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
