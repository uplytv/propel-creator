import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronUp } from "lucide-react";
import { useToggleTourCityVote, type TourCityRequest } from "../hooks/useTourCityRequests";

interface Props {
  request: TourCityRequest;
  voted: boolean;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "secondary",
  considering: "outline",
  booked: "default",
  declined: "destructive",
};

export const TourCityRequestCard = memo(function TourCityRequestCard({ request, voted }: Props) {
  const toggle = useToggleTourCityVote();

  return (
    <Card className="p-3 flex items-center gap-3 bg-card border-border">
      <Button
        size="sm"
        variant={voted ? "default" : "outline"}
        className="flex-col h-auto min-w-[56px] min-h-[56px] gap-0.5"
        onClick={() => toggle.mutate({ request_id: request.id, voted })}
        disabled={toggle.isPending}
        aria-label={voted ? "Remove vote" : "Vote for this city"}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-bold">{request.vote_count}</span>
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <h4 className="font-semibold text-foreground truncate">{request.city}</h4>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {[request.region, request.country].filter(Boolean).join(", ")}
        </p>
        {request.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{request.notes}</p>
        )}
      </div>
      <Badge variant={statusVariant[request.status] ?? "secondary"} className="capitalize shrink-0">
        {request.status}
      </Badge>
    </Card>
  );
});
