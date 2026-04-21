import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { GlobalEvent } from "./GlobalEventCard";

export function UpcomingEventsWidget({ userCountry }: { userCountry?: string | null }) {
  const [events, setEvents] = useState<GlobalEvent[]>([]);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("events_global")
        .select("*")
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(5);
      if (userCountry) q = q.ilike("country", `%${userCountry}%`);
      const { data } = await q;
      setEvents((data as GlobalEvent[]) || []);
    })();
  }, [userCountry]);

  if (events.length === 0) return null;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Upcoming Events</h3>
        <Link to="/events" className="text-xs text-primary hover:underline flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <Link key={e.id} to={`/events/global/${e.id}`} className="flex gap-3 p-2 rounded-lg hover:bg-accent/50 transition">
            {e.image_url && <img src={e.image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" loading="lazy" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium line-clamp-1">{e.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {e.date && new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {e.city && <><MapPin className="w-3 h-3" />{e.city}</>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
