import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface EventDiscoveryCardProps {
  event: any;
}

export default function EventDiscoveryCard({ event }: EventDiscoveryCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/events/${event.id}`)}
      className="rounded-xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {event.cover_image && (
        <img src={event.cover_image} className="w-full h-28 object-cover" alt={event.title} />
      )}
      {!event.cover_image && (
        <div className="w-full h-28 bg-white/5 flex items-center justify-center">
          <span className="text-2xl">🎶</span>
        </div>
      )}
      <div className="p-2.5">
        <h3 className="text-sm font-bold text-white truncate">{event.title}</h3>
        {event.event_date && (
          <p className="text-[11px] mt-0.5" style={{ color: "#00FF85" }}>
            {format(new Date(event.event_date), "EEE M/d")} · {event.venue || event.location || "TBD"}
          </p>
        )}
        {event.cover_charge && (
          <p className="text-[10px] text-white/40 mt-0.5">${event.cover_charge} cover</p>
        )}
      </div>
    </div>
  );
}
