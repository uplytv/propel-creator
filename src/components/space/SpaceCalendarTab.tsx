import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ExternalLink, Check } from "lucide-react";
import { useCommunityEvents, useCreateEvent } from "@/hooks/useCommunityMembers";
import { useEventRsvps, useToggleRsvp, type EventRsvpInfo } from "@/hooks/useCommunityDepth";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

export default function SpaceCalendarTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const { data: events = [] } = useCommunityEvents(creatorId);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const eventsOnDay = (day: Date) =>
    events.filter((e: any) => isSameDay(parseISO(e.event_date), day));

  const upcomingEvents = events
    .filter((e: any) => parseISO(e.event_date) >= new Date())
    .slice(0, 5);

  // RSVPs — members-only via RLS; +15 points awarded server-side on first RSVP
  const { data: rsvpMap = {} } = useEventRsvps(upcomingEvents.map((e: any) => e.id));
  const toggleRsvp = useToggleRsvp();

  const handleRsvp = (eventId: string, going: boolean) => {
    if (!user) {
      toast.error("Sign in to RSVP");
      return;
    }
    toggleRsvp.mutate(
      { eventId, going },
      {
        onError: (err: any) =>
          toast.error("Couldn't RSVP", {
            description: String(err?.message || "").toLowerCase().includes("row-level security")
              ? "Join this community to RSVP to events."
              : err.message,
          }),
      }
    );
  };

  return (
    <div className="px-4 pt-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-base font-bold text-foreground">{format(currentDate, "MMMM yyyy")}</h2>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "hsl(var(--muted-foreground))" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {paddedDays.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayEvents = eventsOnDay(day);
          const today = isToday(day);
          return (
            <div
              key={i}
              className="aspect-square flex flex-col items-center justify-center rounded-lg relative text-xs"
              style={{
                background: today ? "hsl(var(--primary))" : dayEvents.length > 0 ? "hsl(var(--background))" : "transparent",
                color: today ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              }}
            >
              {day.getDate()}
              {dayEvents.length > 0 && !today && (
                <div className="w-1 h-1 rounded-full absolute bottom-1" style={{ background: "hsl(var(--primary))" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Add event */}
      {isOwner && (
        <button
          onClick={() => setShowAddEvent(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold mb-4"
          style={{ border: "1px dashed hsl(var(--border))", color: "hsl(var(--primary))" }}
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      )}

      {/* Upcoming Events */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Events</h3>
      {upcomingEvents.length === 0 ? (
        <div className="p-8 text-center rounded-lg" style={{ background: "hsl(var(--background))" }}>
          <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map((event: any) => {
            const rsvp: EventRsvpInfo = (rsvpMap as Record<string, EventRsvpInfo>)[event.id] || { count: 0, mine: false, attendees: [] };
            return (
              <div key={event.id} className="p-3 rounded-lg" style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {format(parseISO(event.event_date), "MMM d, yyyy")}
                      {event.event_time && ` · ${event.event_time}`}
                    </p>
                    {event.description && <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{event.description}</p>}
                  </div>
                  {event.link && (
                    <a href={event.link} target="_blank" rel="noreferrer" className="p-1">
                      <ExternalLink className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                    </a>
                  )}
                </div>

                {/* RSVP row — Going button, going-count, attendee avatars */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    {rsvp.attendees.length > 0 && (
                      <div className="flex -space-x-2">
                        {rsvp.attendees.map((a) =>
                          a.avatar_url ? (
                            <img
                              key={a.user_id}
                              src={a.avatar_url}
                              alt={a.display_name}
                              title={a.display_name}
                              loading="lazy"
                              className="w-6 h-6 rounded-full object-cover border-2 border-background"
                            />
                          ) : (
                            <div
                              key={a.user_id}
                              title={a.display_name}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted text-foreground border-2 border-background"
                            >
                              {(a.display_name || "M").charAt(0)}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {rsvp.count === 0 ? "Be the first to RSVP" : `${rsvp.count} going`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={rsvp.mine ? "outline" : "default"}
                    className="h-7 px-3 text-xs font-semibold"
                    onClick={() => handleRsvp(event.id, !rsvp.mine)}
                    disabled={toggleRsvp.isPending}
                  >
                    {rsvp.mine ? (
                      <><Check className="w-3.5 h-3.5 mr-1" /> Going</>
                    ) : (
                      "Going?"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddEventDialog open={showAddEvent} onClose={() => setShowAddEvent(false)} creatorId={creatorId} />
    </div>
  );
}

function AddEventDialog({ open, onClose, creatorId }: { open: boolean; onClose: () => void; creatorId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [link, setLink] = useState("");
  const createEvent = useCreateEvent();
  const handleSubmit = async () => {
    if (!title.trim() || !eventDate) return;
    await createEvent.mutateAsync({ creator_id: creatorId, title, description, event_date: eventDate, event_time: eventTime || undefined, link: link || undefined });
    setTitle(""); setDescription(""); setEventDate(""); setEventTime(""); setLink("");
    onClose();
    toast.success("Event added!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-0" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
        <DialogHeader><DialogTitle className="text-foreground">Add Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-foreground placeholder:text-muted-foreground" style={{ background: "hsl(var(--card))" }} />
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="border-0 text-foreground" style={{ background: "hsl(var(--card))" }} />
          <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="border-0 text-foreground" style={{ background: "hsl(var(--card))" }} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-foreground placeholder:text-muted-foreground" style={{ background: "hsl(var(--card))" }} />
          <Input placeholder="Link (optional, e.g. Zoom URL)" value={link} onChange={(e) => setLink(e.target.value)} className="border-0 text-foreground placeholder:text-muted-foreground" style={{ background: "hsl(var(--card))" }} />
          <Button onClick={handleSubmit} disabled={!title.trim() || !eventDate} className="w-full font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>Add Event</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
