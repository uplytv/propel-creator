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
  const { data: profile } = useQuery({
    queryKey: ["profile-location", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("location").eq("user_id", user.id).single();
      return data as { location: string | null } | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const navigate = useNavigate();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["social-events", filter, user?.id, profile?.location],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);

      // Filter by user's city if available
      if (profile?.location && (filter === "active" || !filter)) {
        query = query.ilike("location_city", `%${profile.location}%`);
      }

      if (filter === "new") {
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", threeDaysAgo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If location filter returned nothing, fetch all
      if (data && data.length === 0 && profile?.location && filter === "active") {
        const { data: allData } = await supabase
          .from("events")
          .select("*")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(limit);
        return allData || [];
      }

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
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <span className="text-4xl mb-3">🗺️</span>
        <p className="text-sm text-white font-semibold mb-1">
          No events {profile?.location ? `in ${profile.location}` : "nearby"} yet
        </p>
        <p className="text-xs text-white/40 mb-4">Check back later or explore all events</p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/events")}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95"
            style={{ border: "1.5px solid rgba(255,255,255,0.2)", color: "white" }}
          >
            Browse All Events
          </button>
          <button
            onClick={() => navigate("/social/producers")}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
            style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}
          >
            Create an Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
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

      {events.length >= 4 && showSeeAll && (
        <button
          onClick={() => navigate("/events")}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          See All Events
        </button>
      )}
    </div>
  );
}
