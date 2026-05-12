import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Mic2, Music4 } from "lucide-react";
import type { CoverRequest } from "../hooks/useCoverRequests";

interface Props {
  request: CoverRequest;
  onClick?: () => void;
}

export function CoverRequestCard({ request, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Mic2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{request.title}</h3>
            <Badge variant="outline" className="capitalize">{request.status}</Badge>
          </div>
          {request.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1">
              <Music4 className="h-3.5 w-3.5" /> {request.request_count} votes
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
