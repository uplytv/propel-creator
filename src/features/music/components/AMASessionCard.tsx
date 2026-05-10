import { Link } from "react-router-dom";
import type { AMASession } from "../hooks/useAMA";
import { CalendarClock, Mic } from "lucide-react";

export default function AMASessionCard({ session }: { session: AMASession }) {
  const when = new Date(session.scheduled_for);
  return (
    <Link
      to={`/music/ama/${session.id}`}
      className="block rounded-xl border border-border/50 bg-card/40 overflow-hidden"
    >
      {session.cover_url ? (
        <div
          className="aspect-video w-full bg-muted"
          style={{ background: `url(${session.cover_url}) center/cover` }}
        />
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Mic className="h-10 w-10 text-primary" />
        </div>
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground line-clamp-1">{session.title}</h3>
          <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-primary/15 text-primary">
            {session.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>
            {when.toLocaleDateString()} · {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </Link>
  );
}
