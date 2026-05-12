import { ListMusic, Calendar, MapPin, Vote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FanSetlist } from "../hooks/useFanSetlists";

interface Props {
  setlist: FanSetlist;
  onClick?: () => void;
}

export function FanSetlistCard({ setlist, onClick }: Props) {
  const statusVariant =
    setlist.status === "voting" ? "default" : setlist.status === "closed" ? "secondary" : "outline";

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition min-h-[44px]"
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ListMusic className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading text-base truncate">{setlist.show_title}</h3>
            <Badge variant={statusVariant} className="capitalize text-xs">
              {setlist.status}
            </Badge>
          </div>
          {setlist.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{setlist.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {setlist.show_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(setlist.show_date).toLocaleDateString()}
              </span>
            )}
            {setlist.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {setlist.venue}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Vote className="h-3.5 w-3.5" />
              {setlist.vote_count} votes
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
