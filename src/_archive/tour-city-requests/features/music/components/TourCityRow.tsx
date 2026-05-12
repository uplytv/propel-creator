import { Button } from "@/components/ui/button";
import { MapPin, ThumbsUp } from "lucide-react";
import { useCastTourVote, useRemoveTourVote, type TourSuggestionCity } from "../hooks/useTourSuggestions";

interface Props {
  city: TourSuggestionCity;
  voted: boolean;
  maxVotes: number;
}

export function TourCityRow({ city, voted, maxVotes }: Props) {
  const cast = useCastTourVote();
  const remove = useRemoveTourVote();
  const pct = maxVotes > 0 ? Math.min(100, (city.vote_count / maxVotes) * 100) : 0;

  const toggle = () => {
    if (voted) remove.mutate({ suggestionId: city.suggestion_id, cityId: city.id });
    else cast.mutate({ suggestionId: city.suggestion_id, cityId: city.id });
  };

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card">
      <div
        className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center gap-3 p-3">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{city.city}</div>
          <div className="text-xs text-muted-foreground truncate">
            {[city.region, city.country].filter(Boolean).join(", ") || "—"}
          </div>
        </div>
        <div className="text-sm tabular-nums text-muted-foreground min-w-[2ch] text-right">
          {city.vote_count}
        </div>
        <Button
          size="icon"
          variant={voted ? "default" : "outline"}
          className="h-11 w-11 shrink-0"
          onClick={toggle}
          disabled={cast.isPending || remove.isPending}
          aria-label={voted ? "Remove vote" : "Vote for city"}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
