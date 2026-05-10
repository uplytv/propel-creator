import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Headphones, Users, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { SyncSession, RsvpStatus } from "../hooks/useSyncSessions";
import { useMyRsvp, useSetRsvp } from "../hooks/useSyncSessions";

export function SyncSessionCard({ session }: { session: SyncSession }) {
  const { data: myRsvp } = useMyRsvp(session.id);
  const set = useSetRsvp();

  const choices: { v: RsvpStatus; label: string }[] = [
    { v: "going", label: "Going" },
    { v: "maybe", label: "Maybe" },
    { v: "cant", label: "Can't" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-4">
        {session.cover_url ? (
          <img
            src={session.cover_url}
            alt={session.title}
            loading="lazy"
            className="w-20 h-20 rounded-md object-cover bg-muted flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-7 h-7 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={session.status === "live" ? "default" : "secondary"} className="capitalize">
              {session.status}
            </Badge>
          </div>
          <div className="font-semibold truncate">{session.title}</div>
          {session.album_name && (
            <div className="text-xs text-muted-foreground truncate">{session.album_name}</div>
          )}
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(session.scheduled_at), "EEE, MMM d · h:mm a")}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {session.duration_minutes}m
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {session.going_count}/{session.capacity}
              </span>
            </div>
          </div>
        </div>
      </div>
      {session.host_message && (
        <div className="px-4 pb-2 text-xs text-muted-foreground italic">"{session.host_message}"</div>
      )}
      <div className="px-4 pb-4 flex gap-2">
        {choices.map((c) => (
          <Button
            key={c.v}
            size="sm"
            variant={myRsvp === c.v ? "default" : "outline"}
            disabled={set.isPending}
            onClick={() => set.mutate({ session_id: session.id, rsvp: c.v })}
            className="flex-1 min-h-11"
          >
            {c.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
