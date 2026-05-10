import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Plane, Users } from "lucide-react";
import type { TourSuggestion } from "../hooks/useTourSuggestions";

interface Props {
  suggestion: TourSuggestion;
  onClick?: () => void;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  reviewing: "secondary",
  closed: "outline",
};

export function TourSuggestionCard({ suggestion, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Plane className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{suggestion.title}</h3>
            <Badge variant={STATUS_VARIANT[suggestion.status] ?? "outline"} className="capitalize">
              {suggestion.status}
            </Badge>
          </div>
          {suggestion.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {suggestion.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {suggestion.suggestion_count} cities
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> fan-driven
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
