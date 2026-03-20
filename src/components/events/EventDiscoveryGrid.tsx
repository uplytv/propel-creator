import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Monitor, Globe, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePublishedEvents, EventRow } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, isThisWeek, isThisMonth } from "date-fns";

const filters = [
  { value: "all", label: "All" },
  { value: "virtual", label: "🖥️ Virtual" },
  { value: "in_person", label: "📍 In Person" },
  { value: "free", label: "Free" },
];

const typeBadge: Record<string, { emoji: string; color: string; label: string }> = {
  virtual: { emoji: "🖥️", color: "bg-[#3B82F6]/20 text-[#3B82F6]", label: "Virtual" },
  in_person: { emoji: "📍", color: "bg-[#F59E0B]/20 text-[#F59E0B]", label: "In Person" },
  hybrid: { emoji: "🌐", color: "bg-[#8B5CF6]/20 text-[#8B5CF6]", label: "Hybrid" },
};

function EventCard({ event }: { event: EventRow }) {
  const navigate = useNavigate();
  const badge = typeBadge[event.event_type] || typeBadge.virtual;

  // Get creator profile
  const { data: creator } = useQuery({
    queryKey: ["event-card-creator", event.creator_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("user_id", event.creator_id).maybeSingle();
      return data;
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate(`/creator/${creator?.username}/events/${event.slug}`)}
    >
      <div className="aspect-video w-full overflow-hidden relative">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className={badge.color + " text-xs backdrop-blur-sm"}>
            {badge.emoji} {badge.label}
          </Badge>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-foreground text-sm truncate">{event.title}</h3>
        <div className="flex items-center gap-2">
          {creator?.avatar_url && <img src={creator.avatar_url} className="w-5 h-5 rounded-full" />}
          <span className="text-xs text-muted-foreground">{creator?.display_name || creator?.username}</span>
        </div>
        <p className="text-xs text-primary">{format(new Date(event.starts_at), "EEE MMM d · h:mm a")}</p>
        {event.location_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location_name}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-foreground">
            {event.is_free ? <span className="text-primary">FREE</span> : `$${event.ticket_price}`}
          </span>
          {event.ticket_quantity && event.ticket_quantity - event.tickets_sold <= 20 && !event.is_sold_out && (
            <span className="text-xs text-[#FF3B3B]">{event.ticket_quantity - event.tickets_sold} left</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function EventDiscoveryGrid() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: events, isLoading } = usePublishedEvents(filter === "all" ? undefined : filter);

  const filtered = events?.filter(e => {
    if (!search) return true;
    return e.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Input
        placeholder="Search events..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-9"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : !filtered?.length ? (
        <EmptyState
          icon={<CalendarDays className="w-10 h-10 text-primary" />}
          title="No upcoming events"
          description="Check back soon for new events from creators you follow."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
