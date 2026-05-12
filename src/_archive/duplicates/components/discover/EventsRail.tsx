import { MapPin, Calendar, Ticket } from "lucide-react";
import { useExternalEvents, trackExternalEventClick } from "@/hooks/useExternalEvents";
import { useAuth } from "@/context/AuthContext";
import DiscoverRow from "./DiscoverRow";

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function EventsRail() {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useExternalEvents({ limit: 12 });

  if (isLoading || events.length === 0) return null;

  return (
    <DiscoverRow title="🎪 Festivals & Events" subtitle="Tap to grab tickets — powered by partners worldwide">
      {events.map((e) => (
        <a
          key={e.id}
          href={e.affiliate_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => trackExternalEventClick(e.id, user?.id)}
          className="group/card snap-start shrink-0 w-[260px] md:w-[320px] rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 hover:scale-[1.03] transition-all duration-200"
        >
          <div className="relative aspect-video bg-muted overflow-hidden">
            {e.image_url && (
              <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            {e.is_featured && (
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-primary-foreground">
                FEATURED
              </span>
            )}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-sm md:text-base font-bold text-white drop-shadow-lg line-clamp-1">{e.title}</p>
            </div>
          </div>
          <div className="p-2.5 space-y-1">
            {e.start_date && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(e.start_date)}
              </p>
            )}
            {(e.city || e.venue_name) && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" /> {[e.venue_name, e.city, e.country].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              {e.min_price != null && (
                <span className="text-xs font-semibold text-foreground">
                  from ${Number(e.min_price).toFixed(0)}
                </span>
              )}
              <span className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover/card:underline">
                <Ticket className="w-3 h-3" /> Get Tickets
              </span>
            </div>
          </div>
        </a>
      ))}
    </DiscoverRow>
  );
}
