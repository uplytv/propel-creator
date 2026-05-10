import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useArtistAlert, useToggleArtistAlert } from "../hooks/useTourCalendar";

interface Props {
  artistId: string;
  city?: string;
  country?: string;
  size?: "sm" | "md";
}

export function ArtistAlertButton({ artistId, city, country, size = "md" }: Props) {
  const { data: alert } = useArtistAlert(artistId);
  const toggle = useToggleArtistAlert();
  const enabled = !!alert;

  const handleClick = async () => {
    try {
      await toggle.mutateAsync({ artist_id: artistId, enable: !enabled, city, country });
      toast.success(enabled ? "Alerts off" : "You'll be notified of new tour dates");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <button
      onClick={handleClick}
      disabled={toggle.isPending}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${
        enabled
          ? "bg-primary/20 text-primary border border-primary/40"
          : "bg-card border border-border text-foreground"
      }`}
    >
      {enabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
      {enabled ? "Alerts on" : "Notify me"}
    </button>
  );
}
