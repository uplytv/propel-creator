import { Link } from "react-router-dom";
import type { GuestList } from "../hooks/useGuestLists";
import { CalendarClock, MapPin, Users } from "lucide-react";

export default function GuestListCard({ list }: { list: GuestList }) {
  const date = new Date(list.show_date);
  const remaining = Math.max(0, list.capacity - list.spots_used);
  const pct = list.capacity ? Math.min(100, (list.spots_used / list.capacity) * 100) : 0;
  return (
    <Link
      to={`/music/guest-lists/${list.id}`}
      className="block rounded-xl border border-border/50 bg-card/40 p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 flex-1">
          {list.show_title}
        </h3>
        <span
          className={`text-[10px] uppercase rounded px-1.5 py-0.5 ${
            list.status === "open"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {list.status}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>{date.toLocaleString()}</span>
      </div>
      {list.venue && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{list.venue}</span>
        </div>
      )}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {list.spots_used} / {list.capacity} spots
          </span>
          <span>{remaining} left</span>
        </div>
      </div>
    </Link>
  );
}
