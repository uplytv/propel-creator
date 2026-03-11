import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ExternalLink } from "lucide-react";
import { useCommunityEvents, useCreateEvent } from "@/hooks/useCommunityMembers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

export default function SpaceCalendarTab({ creatorId, isOwner }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const { data: events = [] } = useCommunityEvents(creatorId);
  const { toast } = useToast();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const eventsOnDay = (day: Date) =>
    events.filter((e: any) => isSameDay(new Date(e.event_date), day));

  const upcomingEvents = events
    .filter((e: any) => new Date(e.event_date) >= new Date())
    .slice(0, 5);

  return (
    <div className="px-4 pt-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-base font-bold text-white">{format(currentDate, "MMMM yyyy")}</h2>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "#888" }}>{d}</div>
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
                background: today ? "#00FF85" : dayEvents.length > 0 ? "#111111" : "transparent",
                color: today ? "#0A0A0A" : "#fff",
              }}
            >
              {day.getDate()}
              {dayEvents.length > 0 && !today && (
                <div className="w-1 h-1 rounded-full absolute bottom-1" style={{ background: "#00FF85" }} />
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
          style={{ border: "1px dashed #1e1e1e", color: "#00FF85" }}
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      )}

      {/* Upcoming Events */}
      <h3 className="text-sm font-semibold text-white mb-3">Upcoming Events</h3>
      {upcomingEvents.length === 0 ? (
        <div className="p-8 text-center rounded-lg" style={{ background: "#111111" }}>
          <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "#888" }} />
          <p className="text-sm" style={{ color: "#888" }}>No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map((event: any) => (
            <div key={event.id} className="p-3 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <p className="text-xs" style={{ color: "#888" }}>
                    {format(new Date(event.event_date), "MMM d, yyyy")}
                    {event.event_time && ` · ${event.event_time}`}
                  </p>
                  {event.description && <p className="text-xs mt-1" style={{ color: "#ccc" }}>{event.description}</p>}
                </div>
                {event.link && (
                  <a href={event.link} target="_blank" rel="noreferrer" className="p-1">
                    <ExternalLink className="w-4 h-4" style={{ color: "#00FF85" }} />
                  </a>
                )}
              </div>
            </div>
          ))}
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
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim() || !eventDate) return;
    await createEvent.mutateAsync({ creator_id: creatorId, title, description, event_date: eventDate, event_time: eventTime || undefined, link: link || undefined });
    setTitle(""); setDescription(""); setEventDate(""); setEventTime(""); setLink("");
    onClose();
    toast({ title: "Event added!" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-0" style={{ background: "#111111", color: "#fff" }}>
        <DialogHeader><DialogTitle className="text-white">Add Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="border-0 text-white" style={{ background: "#1e1e1e" }} />
          <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="border-0 text-white" style={{ background: "#1e1e1e" }} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Input placeholder="Link (optional, e.g. Zoom URL)" value={link} onChange={(e) => setLink(e.target.value)} className="border-0 text-white placeholder:text-gray-500" style={{ background: "#1e1e1e" }} />
          <Button onClick={handleSubmit} disabled={!title.trim() || !eventDate} className="w-full font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>Add Event</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
