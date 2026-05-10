import { Calendar, Check, Heart, X, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useMyConcertRsvp,
  useConcertRsvpCounts,
  useSetConcertRsvp,
  type RsvpStatus,
} from "../hooks/useConcertRsvp";
import { downloadICS, googleCalendarUrl } from "../lib/calendar";
import { toast } from "sonner";

interface Concert {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  stream_url?: string | null;
}

export function ConcertRsvpControls({ concert }: { concert: Concert }) {
  const { data: my } = useMyConcertRsvp(concert.id);
  const { data: counts } = useConcertRsvpCounts(concert.id);
  const setRsvp = useSetConcertRsvp();

  const click = (status: RsvpStatus) => {
    setRsvp.mutate(
      { concertId: concert.id, status },
      {
        onSuccess: () => toast.success(`Marked as ${status.replace("_", " ")}`),
        onError: (e: any) => toast.error(e?.message ?? "Failed"),
      },
    );
  };

  const ics = () =>
    downloadICS(
      {
        uid: concert.id,
        title: concert.title,
        description: concert.description ?? "",
        startsAt: concert.starts_at,
        endsAt: concert.ends_at ?? undefined,
        url: concert.stream_url ?? undefined,
      },
      `${concert.title.replace(/\s+/g, "_")}.ics`,
    );

  const gcal = googleCalendarUrl({
    uid: concert.id,
    title: concert.title,
    description: concert.description ?? "",
    startsAt: concert.starts_at,
    endsAt: concert.ends_at ?? undefined,
    url: concert.stream_url ?? undefined,
  });

  const Btn = ({ status, icon: Icon, label }: { status: RsvpStatus; icon: any; label: string }) => {
    const active = my?.status === status;
    return (
      <Button
        variant={active ? "default" : "outline"}
        size="sm"
        className="flex-1"
        onClick={() => click(status)}
        disabled={setRsvp.isPending}
      >
        <Icon className="h-4 w-4 mr-1" />
        {label}
      </Button>
    );
  };

  return (
    <section className="rounded-xl bg-card/40 border border-border/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">RSVP</h2>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline" className="text-[10px]">
            {counts?.going ?? 0} going
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {counts?.interested ?? 0} interested
          </Badge>
        </div>
      </div>

      <div className="flex gap-2">
        <Btn status="going" icon={Check} label="Going" />
        <Btn status="interested" icon={Heart} label="Interested" />
        <Btn status="not_going" icon={X} label="Can't" />
      </div>

      <div className="flex gap-2 pt-2 border-t border-border/30">
        <Button variant="ghost" size="sm" className="flex-1" onClick={ics}>
          <Download className="h-4 w-4 mr-1" /> .ics
        </Button>
        <Button variant="ghost" size="sm" className="flex-1" asChild>
          <a href={gcal} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Google
          </a>
        </Button>
      </div>
    </section>
  );
}
