import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface FanClubCardProps {
  club: {
    id: string;
    name: string;
    description?: string | null;
    monthly_price_cents: number;
    member_count: number;
    artwork_url?: string | null;
  };
}

export function FanClubCard({ club }: FanClubCardProps) {
  return (
    <Link to={`/music/fan-clubs/${club.id}`}>
      <Card className="overflow-hidden hover:border-primary transition-colors h-full">
        <div className="aspect-square bg-muted relative">
          {club.artwork_url ? (
            <img src={club.artwork_url} alt={club.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <Badge className="absolute top-2 right-2">${(club.monthly_price_cents / 100).toFixed(0)}/mo</Badge>
        </div>
        <div className="p-3">
          <h3 className="font-semibold truncate">{club.name}</h3>
          {club.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{club.description}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Users className="w-3 h-3" /> {club.member_count} members
          </div>
        </div>
      </Card>
    </Link>
  );
}
