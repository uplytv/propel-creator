import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import EventDiscoveryCard from "./EventDiscoveryCard";
import { tables } from "@/lib/supabaseTyped";
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
      const { data } = await (supabase as any).from("profiles").select("location").eq("user_id", user.id).single();
      return data as { location: string | null } | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const navigate = useNavigate();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["social-events-union", filter, user?.id, profile?.location],
    queryFn: async () => {
      const nowIso = new Date().toISOString();

      // 1. UPLY-native events
      let uplyQ = supabase
        .from("events")
        .select("*")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (profile?.location && (filter === "active" || !filter)) {
        uplyQ = uplyQ.ilike("location_city", `%${profile.location}%`);
      }
      if (filter === "new") {
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        uplyQ = uplyQ.gte("created_at", threeDaysAgo);
      }

      // 2. Global events (Ticketmaster/Eventbrite)
      let globalQ = (supabase as any)
        .from("events_global")
        .select("*")
        .gte("date", nowIso)
        .order("date", { ascending: true })
        .limit(limit);
      if (profile?.location && (filter === "active" || !filter)) {
        globalQ = globalQ.ilike("city", `%${profile.location}%`);
      }
      if (filter === "new") {
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        globalQ = globalQ.gte("created_at", threeDaysAgo);
      }

      const [uplyRes, globalRes] = await Promise.all([uplyQ, globalQ]);

      const uply = (uplyRes.data || []).map((e: any) => ({ ...e, _source: "uply" as const }));
      const global = (globalRes.data || []).map((e: any) => ({
        ...e,
        _source: "global" as const,
        starts_at: e.date,
        cover_image: e.image_url,
        location_city: e.city,
        location_name: e.venue,
        ticket_price: null,
        genre_tags: e.genre ? [e.genre] : [],
      }));

      // Fallback: if location filter returned nothing for active, drop it
      if (uply.length === 0 && global.length === 0 && profile?.location && filter === "active") {
        const [u2, g2] = await Promise.all([
          supabase.from("events").select("*").gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(limit),
          (supabase as any).from("events_global").select("*").gte("date", nowIso).order("date", { ascending: true }).limit(limit),
        ]);
        const uplyAll = (u2.data || []).map((e: any) => ({ ...e, _source: "uply" as const }));
        const globalAll = (g2.data || []).map((e: any) => ({
          ...e, _source: "global" as const, starts_at: e.date, cover_image: e.image_url,
          location_city: e.city, location_name: e.venue, ticket_price: null,
          genre_tags: e.genre ? [e.genre] : [],
        }));
        return [...uplyAll, ...globalAll]
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
          .slice(0, limit);
      }

      return [...uply, ...global]
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, limit);
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
        <p className="text-sm text-foreground font-semibold mb-1">
          No events {profile?.location ? `in ${profile.location}` : "nearby"} yet
        </p>
        <p className="text-xs text-muted-foreground mb-4">Check back later or explore all events</p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/events")}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95"
            style={{ border: "1.5px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
          >
            Browse All Events
          </button>
          <button
            onClick={() => navigate("/social/producers")}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
            style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
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
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {showSeeAll && (
          <button
            onClick={() => navigate("/events")}
            className="flex items-center gap-0.5 text-xs font-semibold"
            style={{ color: "hsl(var(--muted-foreground))" }}
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
            backgroundColor: "hsl(var(--card))",
            color: "hsl(var(--muted-foreground))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          See All Events
        </button>
      )}
    </div>
  );
}
