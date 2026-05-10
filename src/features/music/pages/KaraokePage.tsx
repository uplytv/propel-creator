import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTrackLyrics, useLyricTranslations, useSaveKaraokeSession, type SyncedLine } from "../hooks/useLyrics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Languages, Play, Pause } from "lucide-react";

export default function KaraokePage() {
  const { trackId } = useParams<{ trackId: string }>();
  const [language, setLanguage] = useState("en");
  const [showTranslation, setShowTranslation] = useState(false);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const { data: lyric } = useTrackLyrics(trackId, language);
  const { data: translations = [] } = useLyricTranslations(lyric?.id);
  const saveSession = useSaveKaraokeSession();

  const lines = useMemo<SyncedLine[]>(
    () => (Array.isArray(lyric?.synced_lines) ? (lyric!.synced_lines as any) : []),
    [lyric],
  );

  const translated = translations[0];

  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now() - t * 1000;
    const tick = () => {
      setT((performance.now() - (startRef.current ?? 0)) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const activeIdx = lines.findIndex((l, i) => t >= l.time && (i === lines.length - 1 || t < lines[i + 1].time));

  const handleFinish = async () => {
    setPlaying(false);
    if (!trackId) return;
    await saveSession.mutateAsync({
      track_id: trackId,
      lyric_id: lyric?.id,
      score: Math.round(activeIdx >= 0 ? (activeIdx / Math.max(lines.length, 1)) * 100 : 0),
      accuracy: 0,
      duration_seconds: Math.round(t),
    });
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold">Karaoke</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTranslation((v) => !v)}
            disabled={!translated}
          >
            <Languages className="w-4 h-4 mr-1" /> {translated?.language ?? "—"}
          </Button>
          <Button size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Card className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
        {lines.length === 0 && (
          <p className="text-muted-foreground text-sm">No synced lyrics for this track yet.</p>
        )}
        {lines.map((line, i) => {
          const isActive = i === activeIdx;
          const transLine = showTranslation
            ? (translated?.translated_synced_lines as any)?.[i]?.text
            : null;
          return (
            <div
              key={i}
              className={`transition-all ${isActive ? "text-primary text-xl font-semibold" : "text-muted-foreground"}`}
            >
              <p>{line.text || "♪"}</p>
              {transLine && <p className="text-xs italic">{transLine}</p>}
            </div>
          );
        })}
      </Card>

      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={handleFinish} variant="secondary">
          <Mic className="w-4 h-4 mr-1" /> Finish & save score
        </Button>
      </div>
    </div>
  );
}
