import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Users, Star } from "lucide-react";
import type { FanSpotlight } from "../hooks/useFanSpotlights";

interface Props {
  spotlight: FanSpotlight;
  onClick?: () => void;
}

export function FanSpotlightCard({ spotlight, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{spotlight.title}</h3>
            <Badge variant="outline" className="capitalize">{spotlight.status}</Badge>
          </div>
          {spotlight.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{spotlight.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {spotlight.submission_count} submissions
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" /> {spotlight.featured_count} featured
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
