import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Flame } from "lucide-react";

export default function TrendingEventsWidget() {
  const navigate = useNavigate();

  const { data: trendingEvents = [] } = useQuery({
    queryKey: ["trending-events"],
    queryFn: async () => {
      // Get events with most attendance/stories in the next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: events } = await (supabase as any)
        .from("events")
        .select("id, title, cover_image, starts_at, event_date, location_name, ticket_price")
        .gte("starts_at", new Date().toISOString())
        .lte("starts_at", nextWeek.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (!events?.length) return [];

      // Get attendance counts
      const eventIds = events.map((e: any) => e.id);
      const { data: attendance } = await (supabase as any)
        .from("attendance")
        .select("event_id")
        .in("event_id", eventIds);

      const countMap: Record<string, number> = {};
      (attendance || []).forEach((a: any) => {
        countMap[a.event_id] = (countMap[a.event_id] || 0) + 1;
      });

      // Sort by attendance count
      return events
        .map((e: any) => ({ ...e, goingCount: countMap[e.id] || 0 }))
        .sort((a: any, b: any) => b.goingCount - a.goingCount)
        .slice(0, 5);
    },
    staleTime: 120_000,
  });

  if (trendingEvents.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4" style={{ color: "#FF6B35" }} />
        <h3 className="text-foreground font-bold text-sm">Trending This Week</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {trendingEvents.map((event: any, i: number) => (
          <button
            key={event.id}
            onClick={() => navigate(`/events/${event.id}`)}
            className="flex-shrink-0 rounded-xl overflow-hidden transition-transform active:scale-[0.97]"
            style={{ width: 150, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="relative">
              {event.cover_image ? (
                <img src={event.cover_image} className="w-full h-20 object-cover" alt={event.title} />
              ) : (
                <div className="w-full h-20 flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                  <span className="text-2xl">🎶</span>
                </div>
              )}
              {/* Rank badge */}
              <span
                className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: i === 0 ? "#FFD700" : "rgba(0,0,0,0.7)", color: i === 0 ? "#0A0A0A" : "#FFF" }}
              >
                {i + 1}
              </span>
            </div>
            <div className="p-2">
              <p className="text-foreground text-xs font-bold line-clamp-2 mb-1">{event.title}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" style={{ color: "#3D7CFF" }} />
                <span className="text-[10px] font-semibold" style={{ color: "#3D7CFF" }}>
                  {event.goingCount} going
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
