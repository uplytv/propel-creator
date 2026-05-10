import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  useEpisode,
  useEpisodeChapters,
  useEpisodeProgress,
  useSaveProgress,
} from '../hooks/useLongformAudio';

function fmtTime(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function LongformPlayerPage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const { data: episode } = useEpisode(episodeId);
  const { data: chapters = [] } = useEpisodeChapters(episodeId);
  const { data: progress } = useEpisodeProgress(episodeId);
  const saveProgress = useSaveProgress();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);

  // Resume from saved progress
  useEffect(() => {
    if (audioRef.current && progress?.position_seconds && !audioRef.current.currentTime) {
      audioRef.current.currentTime = progress.position_seconds;
      setPosition(progress.position_seconds);
    }
  }, [progress]);

  // Periodic save
  useEffect(() => {
    if (!episodeId || !playing) return;
    const id = setInterval(() => {
      const cur = audioRef.current?.currentTime ?? 0;
      saveProgress.mutate({
        episode_id: episodeId,
        position_seconds: Math.floor(cur),
        completed: episode ? cur >= episode.duration_seconds - 5 : false,
      });
    }, 10000);
    return () => clearInterval(id);
  }, [episodeId, playing, episode, saveProgress]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, a.currentTime + delta);
    setPosition(a.currentTime);
  };

  const jumpTo = (s: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = s;
    setPosition(s);
    if (a.paused) {
      a.play();
      setPlaying(true);
    }
  };

  const cycleRate = () => {
    const next = rate >= 2 ? 0.75 : Number((rate + 0.25).toFixed(2));
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  if (!episode) {
    return <div className="p-6 text-muted-foreground">Loading episode…</div>;
  }

  const total = episode.duration_seconds || position;
  const currentChapter = [...chapters].reverse().find((c) => c.start_seconds <= position);

  return (
    <div className="mobile-safe-content min-h-screen p-4 max-w-2xl mx-auto space-y-5">
      {/* Cover */}
      <div className="aspect-square w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted/30">
        {episode.cover_url && (
          <img
            src={episode.cover_url}
            alt={episode.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs uppercase tracking-wider text-primary">{episode.kind}</p>
        <h1 className="text-2xl font-bold">{episode.title}</h1>
        {currentChapter && (
          <p className="text-sm text-muted-foreground">▸ {currentChapter.title}</p>
        )}
      </div>

      <audio
        ref={audioRef}
        src={episode.audio_url}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        preload="metadata"
      />

      {/* Progress */}
      <div className="space-y-1">
        <Slider
          value={[position]}
          max={total}
          step={1}
          onValueChange={(v) => {
            const a = audioRef.current;
            if (a) a.currentTime = v[0];
            setPosition(v[0]);
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmtTime(position)}</span>
          <span>-{fmtTime(Math.max(0, total - position))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => seek(-15)}>
          <Rewind className="w-6 h-6" />
        </Button>
        <Button
          size="icon"
          onClick={toggle}
          className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
        >
          {playing ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => seek(30)}>
          <FastForward className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={cycleRate} className="rounded-full min-h-[44px]">
          {rate}x
        </Button>
      </div>

      {/* Chapters */}
      {chapters.length > 0 && (
        <Card className="p-4 bg-card/40 border-border/40">
          <h3 className="font-semibold mb-3">Chapters</h3>
          <ul className="space-y-1">
            {chapters.map((c) => {
              const active = currentChapter?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => jumpTo(c.start_seconds)}
                    className={`w-full text-left flex items-center gap-3 p-2 rounded-lg min-h-[44px] transition-colors ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/30'
                    }`}
                  >
                    <SkipForward className="w-3 h-3 opacity-50" />
                    <span className="flex-1 text-sm">{c.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {fmtTime(c.start_seconds)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {episode.description && (
        <Card className="p-4 bg-card/40 border-border/40">
          <h3 className="font-semibold mb-2">About this episode</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {episode.description}
          </p>
        </Card>
      )}
    </div>
  );
}

export default LongformPlayerPage;
