import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import { RadiateBroadcast, trackRadiate } from "@/hooks/useRadiate";
import { formatDistanceToNow } from "date-fns";

interface Props {
  radiate: RadiateBroadcast;
  showOwnerActions?: boolean;
  onDelete?: (id: string) => void;
}

export function RadiateCard({ radiate, showOwnerActions, onDelete }: Props) {
  const handleClick = async () => {
    await trackRadiate(radiate.id, "click");
    if (radiate.link_url) window.open(radiate.link_url, "_blank", "noopener");
  };

  const expiresIn = formatDistanceToNow(new Date(radiate.expires_at), { addSuffix: true });

  return (
    <Card className="p-4 space-y-2 bg-card/40 border-border/40">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">{radiate.title}</h3>
        {typeof radiate.distance_km === "number" && (
          <Badge variant="outline" className="text-primary border-primary/40">
            {radiate.distance_km < 1
              ? `${Math.round(radiate.distance_km * 1000)} m`
              : `${radiate.distance_km.toFixed(1)} km`}
          </Badge>
        )}
      </div>
      {radiate.message && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{radiate.message}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {radiate.city || `${radiate.radius_km} km radius`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> Ends {expiresIn}
        </span>
        {showOwnerActions && (
          <span className="ml-auto text-foreground/70">
            {radiate.view_count ?? 0} views · {radiate.click_count ?? 0} clicks
          </span>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        {radiate.link_url && (
          <Button size="sm" onClick={handleClick} className="min-h-[44px] flex-1">
            Open <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        )}
        {showOwnerActions && onDelete && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onDelete(radiate.id)}
          >
            Stop radiating
          </Button>
        )}
      </div>
    </Card>
  );
}
