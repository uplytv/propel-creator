import { useTrackDedications } from "../hooks/useSongDedications";
import { Heart } from "lucide-react";

export default function SongDedicationsWall({ trackId }: { trackId: string }) {
  const { data: dedications, isLoading } = useTrackDedications(trackId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading dedications…</div>;
  }
  if (!dedications?.length) {
    return (
      <div className="rounded-xl border border-border/50 p-6 text-center">
        <Heart className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No dedications yet. Be the first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Dedications</h3>
      <ul className="space-y-2">
        {dedications.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border border-border/50 bg-card/40 p-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Heart className="h-3.5 w-3.5 text-primary" />
              <span>For {d.dedicated_to}</span>
              <span>·</span>
              <span>
                ${(d.amount_cents / 100).toFixed(2)} {d.currency}
              </span>
            </div>
            {d.message && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{d.message}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
