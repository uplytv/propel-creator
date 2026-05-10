import { useParams } from "react-router-dom";
import { useArtistMerch } from "../hooks/useMerchVariants";
import { MerchProductCard } from "../components/MerchProductCard";
import { ShoppingBag } from "lucide-react";

export default function TourMerchPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const { data: merch = [], isLoading } = useArtistMerch(artistId);

  return (
    <div className="mobile-safe-content px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Tour merch
        </h1>
        <p className="text-sm text-muted-foreground">Limited drops with size & color picks</p>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : merch.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No merch available yet. Check back during the tour.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {merch.map((m) => (
            <MerchProductCard key={m.id} product={m} />
          ))}
        </div>
      )}
    </div>
  );
}
