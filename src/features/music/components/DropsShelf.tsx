import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useActiveDrops } from "../hooks/useMusicDrops";
import { DropCard } from "./DropCard";

export function DropsShelf() {
  const { data: drops, isLoading } = useActiveDrops();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!drops || drops.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No drops live right now.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground">Limited Drops</h2>
        <Link to="/music/drops" className="text-xs text-primary font-medium">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {drops.slice(0, 8).map((d) => (
          <DropCard key={d.id} drop={d} />
        ))}
      </div>
    </section>
  );
}
