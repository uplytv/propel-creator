import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  amazon_music: "Amazon Music",
  youtube_music: "YouTube Music",
  tidal: "Tidal",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  submitted: "secondary",
  processing: "secondary",
  live: "default",
  failed: "destructive",
};

export function DSPStatusBadge({ platform, status }: { platform: string; status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="gap-1.5">
      <span className="font-medium">{LABELS[platform] ?? platform}</span>
      <span className="text-[10px] uppercase opacity-80">{status}</span>
    </Badge>
  );
}
