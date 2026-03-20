import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, CalendarDays, MapPin, Monitor, Globe, Loader2, Users, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { useAuth } from "@/context/AuthContext";
import { useCreatorEvents, EventRow } from "@/hooks/useEvents";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/20 text-primary",
  canceled: "bg-destructive/20 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

const typeIcons: Record<string, React.ReactNode> = {
  virtual: <Monitor className="w-3.5 h-3.5" />,
  in_person: <MapPin className="w-3.5 h-3.5" />,
  hybrid: <Globe className="w-3.5 h-3.5" />,
};

const typeBadgeColors: Record<string, string> = {
  virtual: "bg-[#3B82F6]/20 text-[#3B82F6]",
  in_person: "bg-[#F59E0B]/20 text-[#F59E0B]",
  hybrid: "bg-[#8B5CF6]/20 text-[#8B5CF6]",
};

function EventCard({ event }: { event: EventRow }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate(`/events/${event.id}/edit`)}
    >
      {event.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={statusColors[event.status]}>{event.status}</Badge>
          <Badge variant="outline" className={typeBadgeColors[event.event_type]}>
            {typeIcons[event.event_type]}
            <span className="ml-1 capitalize">{event.event_type.replace("_", " ")}</span>
          </Badge>
        </div>
        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
        <p className="text-sm text-primary">{format(new Date(event.starts_at), "EEE MMM d · h:mm a")}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5" />
            {event.tickets_sold} sold{event.ticket_quantity ? ` / ${event.ticket_quantity}` : ""}
          </span>
          <span>{event.is_free ? "FREE" : `$${event.ticket_price}`}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const { data: events, isLoading } = useCreatorEvents();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <BackNav />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Events</h1>
          <Button onClick={() => navigate("/events/create")} className="gap-2">
            <Plus className="w-4 h-4" /> Create Event
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : !events?.length ? (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create your first event to sell tickets and engage your community."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
