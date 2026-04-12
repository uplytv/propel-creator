import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";

interface EventDiscoveryCardProps {
  event: any;
}

export default function EventDiscoveryCard({ event }: EventDiscoveryCardProps) {
  const navigate = useNavigate();

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE M/d");
  };

  // Mock distance and social data for now
  const distance = event.distance || Math.floor(Math.random() * 20 + 1);
  const joinedCount = event.joined_count || Math.floor(Math.random() * 500 + 50);
  const friendsCount = event.friends_count || 0;
  const chatActive = event.chat_active || null;
  const tags = event.genre_tags || event.tags || [];

  return (
    <div
      onClick={() => navigate(`/events/${event.id}`)}
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
        {/* Distance badge */}
        <span
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(4px)",
          }}
        >
          {distance} mi away
        </span>
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h3
          className="font-bold text-white leading-tight mb-1"
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
        {event.event_date && (
          <p
            className="text-[11px] font-semibold leading-tight mb-1"
            style={{ color: "#00FF85" }}
          >
            {formatEventDate(event.event_date)}
            {(event.venue || event.location) && ` · ${event.venue || event.location}`}
          </p>
        )}

        {/* Social proof */}
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-white/50">
            <span className="font-bold text-white/70">{joinedCount}</span> joined
            {friendsCount > 0 && (
              <>
                {" · "}
                <span className="font-bold" style={{ color: "#00FF85" }}>{friendsCount} friends</span>
              </>
            )}
          </p>
          {chatActive && (
            <p className="text-[10px] text-white/35">{chatActive} ago chat active</p>
          )}
        </div>

        {/* Cover charge */}
        {event.cover_charge && (
          <p className="text-[10px] text-white/40 mt-0.5">${event.cover_charge} cover</p>
        )}
      </div>
    </div>
  );
}
