import { useEffect, useState } from "react";
import { Loader2, MapPin, Calendar } from "lucide-react";
import { useNearbyTourDates, useUpcomingTourDates } from "../hooks/useTourCalendar";
import { TourDateCard } from "../components/TourDateCard";

export default function TourCalendarPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tab, setTab] = useState<"nearby" | "all">("nearby");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setTab("all"),
      { timeout: 7000 },
    );
  }, []);

  const { data: nearby, isLoading: loadingNearby } = useNearbyTourDates(coords, 150);
  const { data: upcoming, isLoading: loadingAll } = useUpcomingTourDates(40);

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Tour Calendar</h1>
        <p className="text-sm text-muted-foreground">Live shows, ticket alerts, and gigs near you.</p>
      </header>

      <div className="flex gap-2 sticky top-0 bg-background z-10 py-2">
        <button
          onClick={() => setTab("nearby")}
          className={`flex-1 py-2 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${
            tab === "nearby" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          <MapPin className="w-4 h-4" /> Nearby
        </button>
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${
            tab === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" /> Upcoming
        </button>
      </div>

      {tab === "nearby" ? (
        !coords ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Allow location access to discover nearby gigs.
          </div>
        ) : loadingNearby ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !nearby || nearby.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No tour dates within 150km. Try the Upcoming tab.
          </div>
        ) : (
          <div className="space-y-3">
            {nearby.map((t) => (
              <div key={t.id}>
                <TourDateCard
                  tour={{
                    ...t,
                    region: null, latitude: null, longitude: null,
                    doors_at: null, on_sale_at: null, status: "announced", notes: null,
                  } as any}
                />
                <div className="text-[10px] text-muted-foreground text-right mt-1 pr-1">
                  ~{Math.round(t.distance_km)} km away
                </div>
              </div>
            ))}
          </div>
        )
      ) : loadingAll ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !upcoming || upcoming.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No upcoming dates announced yet.
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((t) => (
            <TourDateCard key={t.id} tour={t} />
          ))}
        </div>
      )}
    </div>
  );
}
