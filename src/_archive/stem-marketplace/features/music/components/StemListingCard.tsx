import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music2 } from "lucide-react";
import type { StemListing } from "../hooks/useStemMarketplace";

interface Props {
  listing: StemListing;
  onBuy?: () => void;
}

export function StemListingCard({ listing, onBuy }: Props) {
  const price = (listing.price_cents / 100).toFixed(2);
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
          <Music2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{listing.title}</h3>
          <p className="text-xs text-muted-foreground truncate">{listing.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {listing.genre && <Badge variant="secondary">{listing.genre}</Badge>}
        {listing.bpm && <Badge variant="secondary">{listing.bpm} BPM</Badge>}
        {listing.musical_key && <Badge variant="secondary">Key: {listing.musical_key}</Badge>}
        <Badge>{listing.license_type.replace("_", " ")}</Badge>
      </div>
      {listing.preview_url && (
        <audio src={listing.preview_url} controls className="w-full h-8" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-primary">${price}</span>
        <Button size="sm" onClick={onBuy}>
          Buy stems
        </Button>
      </div>
    </Card>
  );
}
