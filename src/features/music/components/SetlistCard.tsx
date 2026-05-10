import { Link } from "react-router-dom";
import type { Setlist } from "../hooks/useSetlists";
import { CalendarClock, MapPin, ListMusic } from "lucide-react";

export default function SetlistCard({ setlist }: { setlist: Setlist }) {
  const date = new Date(setlist.show_date);
  return (
    <Link
      to={`/music/setlists/${setlist.id}`}
      className="block rounded-xl border border-border/50 bg-card/40 p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <ListMusic className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 flex-1">
          {setlist.show_title}
        </h3>
        {!setlist.is_published && (
          <span className="text-[10px] uppercase rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
            draft
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>
          {date.toLocaleDateString()} ·{" "}
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {setlist.venue && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{setlist.venue}</span>
        </div>
      )}
    </Link>
  );
}
