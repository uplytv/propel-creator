import { useRef, useState } from "react";
import { Play, Pause, Download, Drum, Mic, Music, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecordStemDownload, type StemKind } from "../hooks/useStemStations";

const KIND_ICON: Record<StemKind, typeof Drum> = {
  drums: Drum,
  bass: Volume2,
  vocals: Mic,
  melody: Music,
  fx: Sparkles,
  other: Music,
};

export interface StemTrackRowProps {
  track: {
    id: string;
    station_id: string;
    kind: StemKind;
    label: string;
    audio_url: string;
    duration_seconds?: number | null;
  };
}

export default function StemTrackRow({ track }: StemTrackRowProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordDownload = useRecordStemDownload();
  const Icon = KIND_ICON[track.kind] ?? Music;

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audio_url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const handleDownload = () => {
    recordDownload.mutate({ station_id: track.station_id, stem_id: track.id });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3 min-h-11">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause stem" : "Play stem"}
        className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {track.kind}
          </span>
        </div>
        <p className="text-sm font-medium truncate">{track.label}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        asChild
        onClick={handleDownload}
        className="min-h-11 min-w-11"
      >
        <a href={track.audio_url} download aria-label={`Download ${track.label} stem`}>
          <Download className="w-4 h-4" />
        </a>
      </Button>
    </div>
  );
}
