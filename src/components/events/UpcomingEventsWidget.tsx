import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { GlobalEvent } from "./GlobalEventCard";

// Haversine distance in miles
function distMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function UpcomingEventsWidget({ userCountry }: { userCountry?: string | null }) {
  const [events, setEvents] = useState<(GlobalEvent & { _distance?: number })[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Try to grab device geolocation (silent fail)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 3000, maximumAge: 60 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("events_global")
        .select("*")
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(coords ? 50 : 5);
      if (userCountry && !coords) q = q.ilike("country", `%${userCountry}%`);
      const { data } = await q;
      let list = (data as GlobalEvent[]) || [];

      // Geo-sort if we have coords + venue lat/lng
      if (coords) {
        list = list
          .map((e: any) => ({
            ...e,
            _distance: e.latitude && e.longitude ? distMiles(coords.lat, coords.lng, e.latitude, e.longitude) : Infinity,
          }))
          .sort((a: any, b: any) => a._distance - b._distance)
          .slice(0, 5);
      }

      setEvents(list);
    })();
  }, [userCountry, coords]);

  if (events.length === 0) return null;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> {coords ? "Events Near You" : "Upcoming Events"}
        </h3>
        <Link to="/events" className="text-xs text-primary hover:underline flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <Link key={e.id} to={`/events/global/${e.id}`} className="flex gap-3 p-2 rounded-lg hover:bg-accent/50 transition">
            {e.image_url && <img src={e.image_url} alt={e.title} className="w-12 h-12 rounded object-cover shrink-0" loading="lazy" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium line-clamp-1">{e.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {e.date && new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {e.city && <><MapPin className="w-3 h-3" />{e.city}</>}
                {e._distance !== undefined && e._distance !== Infinity && (
                  <span className="text-primary">· {Math.round(e._distance)}mi</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
