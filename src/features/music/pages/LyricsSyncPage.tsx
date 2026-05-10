import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTrackLyrics, useUpsertLyrics, parseLRC } from "../hooks/useLyrics";
import { LyricsKaraoke } from "../components/LyricsKaraoke";
import { toast } from "sonner";

export default function LyricsSyncPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const { data: lyrics } = useTrackLyrics(trackId);
  const upsert = useUpsertLyrics();
  const [lrc, setLrc] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      setCurrentTime((Date.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
    } else {
      startRef.current = Date.now() - currentTime * 1000;
      setPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!trackId) return;
    const parsed = parseLRC(lrc);
    if (!parsed.length) {
      toast.error("No valid LRC lines parsed");
      return;
    }
    await upsert.mutateAsync({
      track_id: trackId,
      synced_lines: parsed,
      plain_text: parsed.map((l) => l.text).join("\n"),
      is_published: true,
    });
    toast.success("Lyrics saved");
  };

  const lines = lyrics?.synced_lines ?? [];

  return (
    <div className="container mx-auto p-4 mobile-safe-content max-w-2xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Karaoke Lyrics</h1>
        <p className="text-sm text-muted-foreground">
          Sync time-coded lyrics for your track.
        </p>
      </header>

      <Tabs defaultValue="play">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="play">Play</TabsTrigger>
          <TabsTrigger value="edit">Edit (LRC)</TabsTrigger>
        </TabsList>

        <TabsContent value="play" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={togglePlay} className="min-h-11">
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPlaying(false);
                setCurrentTime(0);
              }}
              className="min-h-11"
            >
              Reset
            </Button>
            <span className="text-sm text-muted-foreground ml-auto tabular-nums">
              {currentTime.toFixed(1)}s
            </span>
          </div>
          <LyricsKaraoke lines={lines} currentTime={currentTime} />
        </TabsContent>

        <TabsContent value="edit" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste LRC format (e.g. <code>[00:12.50]First line</code>)
          </p>
          <Textarea
            value={lrc}
            onChange={(e) => setLrc(e.target.value)}
            rows={14}
            className="font-mono text-sm"
            placeholder={"[00:00.00]Intro\n[00:12.50]First line of the chorus\n[00:18.00]Second line"}
          />
          <Button
            onClick={handleSave}
            disabled={upsert.isPending || !trackId}
            className="w-full min-h-11"
          >
            {upsert.isPending ? "Saving…" : "Save lyrics"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
