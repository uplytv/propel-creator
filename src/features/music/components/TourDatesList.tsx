import { useTourDates } from "../hooks/useTourDates";
import { Calendar, MapPin, Ticket } from "lucide-react";

interface Props {
  artistId?: string;
}

export default function TourDatesList({ artistId }: Props) {
  const { data, isLoading } = useTourDates(artistId);

  if (isLoading) return <div className="h-20 rounded-xl bg-white/5 animate-pulse" />;
  if (!data?.length) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
        <Calendar className="w-6 h-6 mx-auto mb-2 text-white/40" />
        <p className="text-white/50 text-sm">No upcoming shows</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((show) => {
        const date = new Date(show.event_date);
        return (
          <div
            key={show.id}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="text-center min-w-[3rem]">
              <p className="text-white/50 text-[10px] font-bold uppercase">
                {date.toLocaleString("en-US", { month: "short" })}
              </p>
              <p className="text-white font-black text-xl leading-none">{date.getDate()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{show.venue_name}</p>
              <p className="text-white/50 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {show.city}{show.country ? `, ${show.country}` : ""}
              </p>
            </div>
            {show.is_sold_out ? (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/10 text-white/50">
                Sold Out
              </span>
            ) : show.ticket_url ? (
              <a
                href={show.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full"
                style={{ background: "#3D7CFF", color: "#000" }}
              >
                <Ticket className="w-3 h-3" /> Tickets
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
