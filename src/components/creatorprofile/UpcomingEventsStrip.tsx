import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorUserId: string;
  limit?: number;
}

interface EventRow {
  id: string;
  title: string;
  starts_at: string;
  location_name?: string | null;
  location_city?: string | null;
  slug?: string | null;
}

export default function UpcomingEventsStrip({ creatorUserId, limit = 6 }: Props) {
  const { data: events = [] } = useQuery<EventRow[]>({
    queryKey: ["creator-upcoming-events", creatorUserId, limit],
    enabled: !!creatorUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,starts_at,location_name,location_city,slug")
        .eq("creator_id", creatorUserId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);
      return (data || []) as EventRow[];
    },
    staleTime: 60_000,
  });

  if (!events.length) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-6 py-8">
      <h2 className="font-heading text-xl font-semibold mb-4 text-foreground">Upcoming events</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map((e) => (
          <Link
            key={e.id}
            to={e.slug ? `/events/${e.slug}` : `/events/${e.id}`}
            className="block rounded-lg border border-border/40 bg-card/40 p-4 hover:bg-card/60 transition min-h-[44px]"
          >
            <h3 className="font-medium text-foreground line-clamp-2">{e.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(e.starts_at), "MMM d, p")}
              </span>
              {(e.location_name || e.location_city) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {e.location_name || e.location_city}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
