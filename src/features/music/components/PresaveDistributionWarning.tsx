import { AlertTriangle } from "lucide-react";

interface Props {
  spotifyConfirmed: boolean;
  appleConfirmed: boolean;
  className?: string;
}

export default function PresaveDistributionWarning({ spotifyConfirmed, appleConfirmed, className }: Props) {
  if (spotifyConfirmed || appleConfirmed) return null;
  return (
    <div className={`flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm ${className ?? ""}`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-400" />
      <div className="text-yellow-100">
        <strong>Confirm distribution to activate.</strong> This campaign won't fire on Spotify or Apple
        until your track is live there. UPLY doesn't distribute music — submit via DistroKid, TuneCore,
        CD Baby, or another distributor first.
      </div>
    </div>
  );
}
