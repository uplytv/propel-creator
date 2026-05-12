import { Link } from "react-router-dom";
import { Layers, Download, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface StemStationCardProps {
  station: {
    id: string;
    title: string;
    description?: string | null;
    bpm?: number | null;
    music_key?: string | null;
    cover_url?: string | null;
    status: string;
    download_count: number;
  };
  to?: string;
}

export default function StemStationCard({ station, to }: StemStationCardProps) {
  const href = to ?? `/music/stems/${station.id}`;
  return (
    <Link
      to={href}
      className="block rounded-xl border border-border bg-card/50 hover:bg-card transition-colors overflow-hidden"
    >
      <div className="aspect-video bg-muted relative">
        {station.cover_url ? (
          <img
            src={station.cover_url}
            alt={station.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-10 h-10 text-muted-foreground" aria-hidden />
          </div>
        )}
        {station.status !== "published" && (
          <Badge variant="secondary" className="absolute top-2 left-2 capitalize">
            {station.status}
          </Badge>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-1">{station.title}</h3>
        {station.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{station.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {station.bpm ? (
            <span className="inline-flex items-center gap-1">
              <Music2 className="w-3 h-3" aria-hidden /> {station.bpm} BPM
            </span>
          ) : null}
          {station.music_key ? <span>Key {station.music_key}</span> : null}
          <span className="inline-flex items-center gap-1 ml-auto">
            <Download className="w-3 h-3" aria-hidden /> {station.download_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
