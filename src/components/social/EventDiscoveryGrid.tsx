import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import EventDiscoveryCard from "./EventDiscoveryCard";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EventDiscoveryGridProps {
  filter?: "active" | "new" | "producer";
  title?: string;
  showSeeAll?: boolean;
  limit?: number;
}

export default function EventDiscoveryGrid({
  filter,
  title = "Near you",
  showSeeAll = true,
  limit = 20,
}: EventDiscoveryGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["social-events", filter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString().split("T")[0])
        .order("event_date", { ascending: true })
        .limit(limit);

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
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <span className="text-3xl mb-3">🎵</span>
        <p className="text-sm text-white/40 font-medium">No events found nearby</p>
        <p className="text-xs text-white/25 mt-1">Check back later for new events</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {showSeeAll && (
          <button
            onClick={() => navigate("/events")}
            className="flex items-center gap-0.5 text-xs font-semibold"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            See All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {events.map((event: any) => (
          <EventDiscoveryCard key={event.id} event={event} />
        ))}
      </div>

      {/* See All button at bottom for longer lists */}
      {events.length >= 4 && showSeeAll && (
        <button
          onClick={() => navigate("/events")}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          See All
        </button>
      )}
    </div>
  );
}
