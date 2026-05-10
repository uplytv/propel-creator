import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Music } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  listing: {
    id: string;
    title: string;
    gig_type: string;
    base_price_cents: number;
    home_city?: string | null;
    artwork_url?: string | null;
    genres?: string[] | null;
    booking_count: number;
  };
}

export function GigListingCard({ listing }: Props) {
  return (
    <Link to={`/music/gigs/${listing.id}`}>
      <Card className="overflow-hidden hover:border-primary transition-colors h-full">
        <div className="aspect-square bg-muted relative">
          {listing.artwork_url ? (
            <img src={listing.artwork_url} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <Badge className="absolute top-2 left-2 capitalize">{listing.gig_type}</Badge>
        </div>
        <div className="p-3">
          <h3 className="font-semibold truncate">{listing.title}</h3>
          {listing.home_city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {listing.home_city}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-primary">
              from ${(listing.base_price_cents / 100).toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">{listing.booking_count} bookings</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
