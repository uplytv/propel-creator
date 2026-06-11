import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import EventCountdown from "./EventCountdown";
import EventHypeMeter from "./EventHypeMeter";
import GoingButton from "./GoingButton";

interface EventDiscoveryCardProps {
  event: any;
}

export default function EventDiscoveryCard({ event }: EventDiscoveryCardProps) {
  const navigate = useNavigate();

  const isGlobal = event._source === "global";
  const dateStr = event.starts_at || event.event_date || event.date;

  const handleClick = () => {
    if (isGlobal) navigate(`/global-events/${event.id}`);
    else navigate(`/events/${event.id}`);
  };

  const formatEventDate = (d: string) => {
    const date = new Date(d);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE M/d");
  };

  const tags: string[] = event.genre_tags || event.tags || [];
  const venue = event.location_name || event.venue || event.location || "";
  const city = event.location_city || "";
  const price = event.ticket_price;

  return (
    <div
      onClick={handleClick}
      className="rounded-xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]"
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Event Image */}
      <div className="relative">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            className="w-full aspect-[4/3] object-cover"
            alt={event.title}
          />
        ) : (
          <div
            className="w-full aspect-[4/3] flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <span className="text-3xl">🎶</span>
          </div>
        )}
        {/* Price badge */}
        <span
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            color: price && price > 0 ? "#FFFFFF" : "#3D7CFF",
            backdropFilter: "blur(4px)",
          }}
        >
          {price && price > 0 ? `$${price}` : "Free"}
        </span>
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h3
          className="font-bold text-white leading-tight mb-1 line-clamp-2"
          style={{ fontSize: 15 }}
        >
          {event.title}
        </h3>

        {/* Genre tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Date + Venue */}
        {dateStr && (
          <p
            className="text-[11px] font-semibold leading-tight mb-1"
            style={{ color: "#3D7CFF" }}
          >
            {formatEventDate(dateStr)}
            {venue && ` · ${venue}`}
          </p>
        )}

        {city && (
          <p className="text-[10px] text-white/40">{city}</p>
        )}

        {/* Countdown + Hype */}
        {dateStr && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <EventCountdown startsAt={dateStr} compact />
            {!isGlobal && <EventHypeMeter eventId={event.id} compact />}
          </div>
        )}

        {/* Going button */}
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          {isGlobal ? (
            <GoingButton
              globalEventId={event.id}
              eventTitle={event.title}
              eventDate={dateStr}
              size="sm"
              variant="compact"
            />
          ) : (
            <GoingButton
              eventId={event.id}
              eventTitle={event.title}
              eventDate={dateStr}
              size="sm"
              variant="compact"
            />
          )}
        </div>
      </div>
    </div>
  );
}
