import { useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Monitor, Globe, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
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
  virtual: { emoji: "🖥️", color: "bg-blue-500/20 text-blue-500", label: "Virtual" },
  in_person: { emoji: "📍", color: "bg-warning/20 text-warning", label: "In Person" },
  hybrid: { emoji: "🌐", color: "bg-violet-500/20 text-violet-500", label: "Hybrid" },
};

type CardCreator = { display_name: string | null; username: string | null; avatar_url: string | null } | null | undefined;

const EventCard = memo(function EventCard({ event, creator }: { event: EventRow; creator: CardCreator }) {
  const navigate = useNavigate();
  const badge = typeBadge[event.event_type] || typeBadge.virtual;

  const date = new Date(event.starts_at);
  const left = event.ticket_quantity ? event.ticket_quantity - event.tickets_sold : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/${creator?.username || event.creator_id}/events/${event.slug}`)}
    >
      {/* Portrait flyer */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        {/* Date chip */}
        <div className="absolute top-2 left-2 flex flex-col items-center justify-center bg-background/90 backdrop-blur rounded-md w-11 py-1 text-center leading-none">
          <span className="text-[9px] font-bold uppercase text-primary">{format(date, "MMM")}</span>
          <span className="text-base font-extrabold text-foreground">{format(date, "d")}</span>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className={badge.color + " text-[10px] backdrop-blur-sm"}>{badge.emoji} {badge.label}</Badge>
        </div>

        {event.is_sold_out && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-xs font-bold uppercase tracking-widest text-white border border-white/70 rounded px-2 py-1">Sold out</span>
          </div>
        )}

        {/* Title + location overlaid */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow">{event.title}</h3>
          {event.location_name && (
            <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{event.location_name}</span></p>
          )}
        </div>
      </div>

      {/* Meta row below flyer */}
      <div className="pt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {creator?.avatar_url && <img src={creator.avatar_url} alt="" className="w-4 h-4 rounded-full shrink-0" loading="lazy" />}
          <span className="text-xs text-muted-foreground truncate">{creator?.display_name || creator?.username}</span>
        </div>
        <span className="text-sm font-bold text-foreground shrink-0">
          {event.is_free ? <span className="text-primary">FREE</span> : `$${event.ticket_price}`}
        </span>
      </div>
      <p className="text-[11px] text-primary mt-0.5">{format(date, "EEE MMM d · h:mm a")}</p>
      {left != null && left <= 20 && !event.is_sold_out && <p className="text-[11px] text-destructive">{left} left</p>}
    </motion.div>
  );
});

export default function EventDiscoveryGrid() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: events, isLoading } = usePublishedEvents(filter === "all" ? undefined : filter);

  const filtered = events?.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.title, (e as any).location_name, (e as any).location_city, (e as any).location_state, (e as any).description]
      .some(v => typeof v === "string" && v.toLowerCase().includes(q));
  });

  // Batch-fetch every creator profile in ONE query instead of one-per-card (N+1).
  const creatorIds = useMemo(
    () => [...new Set((filtered ?? []).map(e => e.creator_id).filter(Boolean))].sort(),
    [filtered],
  );
  const { data: creatorMap = {} } = useQuery({
    queryKey: ["event-grid-creators", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", creatorIds);
      const map: Record<string, CardCreator> = {};
      (data ?? []).forEach((p: any) => { map[p.user_id] = p; });
      return map;
    },
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
        placeholder="Search events, venues, cities…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-9"
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : !filtered?.length ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming events"
          description="Check back soon for new events from creators you follow."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map(e => <EventCard key={e.id} event={e} creator={creatorMap[e.creator_id]} />)}
        </div>
      )}
    </div>
  );
}
