import { useUpcomingConcerts } from "../hooks/useConcerts";
import { ConcertCard } from "../components/ConcertCard";

export default function ConcertsPage() {
  const { data: concerts = [], isLoading } = useUpcomingConcerts();

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Live Concerts</h1>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : concerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No upcoming concerts. Check back soon.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {concerts.map((c) => <ConcertCard key={c.id} concert={c} />)}
        </div>
      )}
    </div>
  );
}
