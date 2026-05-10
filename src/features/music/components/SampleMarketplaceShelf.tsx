import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSamplePacks } from "../hooks/useSampleMarketplace";
import { SamplePackCard } from "./SamplePackCard";

export function SampleMarketplaceShelf() {
  const { data: packs, isLoading } = useSamplePacks();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!packs || packs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No sample packs yet.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground">Sample Marketplace</h2>
        <Link to="/music/samples" className="text-xs text-primary font-medium">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {packs.slice(0, 8).map((p) => (
          <SamplePackCard key={p.id} pack={p} />
        ))}
      </div>
    </section>
  );
}
