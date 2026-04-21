import { Link } from "react-router-dom";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  } catch {
    return "TBA";
  }
};

export function GlobalEventCard({ event }: { event: GlobalEvent }) {
  return (
    <Card className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all">
      <Link to={`/events/global/${event.id}`} className="block">
        <div className="relative aspect-video bg-muted overflow-hidden">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Calendar className="w-12 h-12" />
            </div>
          )}
          {event.is_persian && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
              🇮🇷 Persian Event
            </Badge>
          )}
          {event.category && (
            <Badge variant="secondary" className="absolute top-2 right-2 capitalize">
              {event.category}
            </Badge>
          )}
        </div>
      </Link>
      <div className="p-4 space-y-2">
        <Link to={`/events/global/${event.id}`}>
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
        </Link>
        {event.artist_name && (
          <p className="text-sm text-muted-foreground line-clamp-1">{event.artist_name}</p>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {formatDate(event.date)}
        </div>
        {(event.venue || event.city) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {[event.venue, event.city, event.country].filter(Boolean).join(" · ")}
          </div>
        )}
        {event.ticket_url && (
          <Button asChild size="sm" className="w-full mt-2" variant="default">
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
              <Ticket className="w-3 h-3 mr-1" /> Get Tickets
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}
