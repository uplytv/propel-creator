import { Headphones, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Lounge = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  scheduled_at: string;
  status: "draft" | "scheduled" | "live" | "ended" | "canceled";
  attendee_count: number;
};

const statusVariants: Record<Lounge["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Upcoming", className: "bg-primary/10 text-primary" },
  live: { label: "Live", className: "bg-destructive text-destructive-foreground animate-pulse" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground line-through" },
};

export function ListeningLoungeCard({ lounge, onClick }: { lounge: Lounge; onClick?: () => void }) {
  const status = statusVariants[lounge.status];
  const date = new Date(lounge.scheduled_at);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 text-left transition hover:border-primary/40 hover:bg-card/60 min-h-[44px]"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {lounge.cover_url ? (
            <img src={lounge.cover_url} alt={lounge.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Headphones className="h-7 w-7 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{lounge.title}</h3>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
          {lounge.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lounge.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {lounge.attendee_count} attending
        </span>
      </div>
    </button>
  );
}
