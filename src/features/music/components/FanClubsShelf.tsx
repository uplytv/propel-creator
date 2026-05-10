import { useFanClubs } from "../hooks/useFanClubs";
import { FanClubCard } from "./FanClubCard";
import { Link } from "react-router-dom";

export function FanClubsShelf({ artistId, title = "Fan clubs" }: { artistId?: string; title?: string }) {
  const { data: clubs = [], isLoading } = useFanClubs(artistId);
  if (isLoading) return null;
  if (clubs.length === 0) return null;

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-display font-bold">{title}</h2>
        <Link to="/music/fan-clubs" className="text-xs text-primary">View all</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {clubs.slice(0, 8).map((c) => (
          <FanClubCard key={c.id} club={c} />
        ))}
      </div>
    </section>
  );
}
