import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import EventDiscoveryCard from "./EventDiscoveryCard";

interface EventDiscoveryGridProps {
  filter?: "active" | "new" | "producer";
}

export default function EventDiscoveryGrid({ filter }: EventDiscoveryGridProps) {
  const { user } = useAuth();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["social-events", filter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString().split("T")[0])
        .order("event_date", { ascending: true })
        .limit(20);

      if (filter === "new") {
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", threeDaysAgo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <p className="text-sm text-white/40">No events found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-3">
      {events.map((event: any) => (
        <EventDiscoveryCard key={event.id} event={event} />
      ))}
    </div>
  );
}
