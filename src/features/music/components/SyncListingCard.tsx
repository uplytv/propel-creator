import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SyncListing } from "../hooks/useSyncLicensing";

export function SyncListingCard({ listing, onClick }: { listing: SyncListing; onClick?: () => void }) {
  const fee =
    listing.min_fee_cents != null && listing.max_fee_cents != null
      ? `$${(listing.min_fee_cents / 100).toFixed(0)}–$${(listing.max_fee_cents / 100).toFixed(0)}`
      : "Negotiable";
  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-accent/30 transition-colors border-border"
    >
      <div className="flex items-start gap-3">
        {listing.artwork_url && (
          <img src={listing.artwork_url} alt={listing.title} className="w-16 h-16 rounded object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{listing.title}</h3>
            {listing.exclusive && <Badge variant="secondary" className="text-[10px]">Exclusive</Badge>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{listing.artist_name}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {(listing.mood ?? []).slice(0, 3).map((m) => (
              <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
            ))}
            {(listing.genre ?? []).slice(0, 2).map((g) => (
              <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
            ))}
          </div>
          <p className="text-xs text-primary mt-2 font-medium">{fee}</p>
        </div>
      </div>
    </Card>
  );
}
