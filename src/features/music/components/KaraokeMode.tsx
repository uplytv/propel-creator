import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLyrics, parseLrc } from '../hooks/useLyrics';
import { useLyricTranslations } from '../hooks/useLyricTranslations';
import { useSubmitKaraokeScore, useKaraokeLeaderboard } from '../hooks/useKaraokeScores';
import { SyncedLyricsView } from './SyncedLyricsView';
import { toast } from 'sonner';

interface Props {
  trackId: string;
  audioRef: React.RefObject<HTMLAudioElement>;
  onClose: () => void;
}

/**
 * Karaoke overlay: synced LRC with score based on mic input level vs. expected line windows.
 * Scoring is heuristic — counts a line as "hit" when avg mic RMS during its window > threshold.
 */
export function KaraokeMode({ trackId, audioRef, onClose }: Props) {
  const { data: lyrics } = useLyrics(trackId);
  const { data: translations = [] } = useLyricTranslations(trackId);
  const { data: leaderboard = [] } = useKaraokeLeaderboard(trackId, 5);
  const submit = useSubmitKaraokeScore(trackId);

  const [lang, setLang] = useState<string>('original');
  const [time, setTime] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [hits, setHits] = useState<Set<number>>(new Set());

  const lrc = useMemo(() => {
    if (lang === 'original') return lyrics?.lrc_text ?? null;
    const t = translations.find((x) => x.language === lang);
    return t?.lrc_text ?? null;
  }, [lang, lyrics, translations]);
  const plain = lang === 'original' ? lyrics?.lyrics_text : translations.find((t) => t.language === lang)?.lyrics_text;
  const lines = useMemo(() => (lyrics?.lrc_text ? parseLrc(lyrics.lrc_text) : []), [lyrics]);

  // Track audio time
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onT = () => setTime(el.currentTime);
    el.addEventListener('timeupdate', onT);
    return () => el.removeEventListener('timeupdate', onT);
  }, [audioRef]);

  // Mic analysis
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();
  useEffect(() => {
    if (!micOn) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        const tick = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          const t = audioRef.current?.currentTime ?? 0;
          if (rms > 0.04) {
            const idx = lines.findIndex((l, i) => {
              const next = lines[i + 1]?.time ?? l.time + 4;
              return t >= l.time && t < next;
            });
            if (idx >= 0) {
              setHits((prev) => {
                if (prev.has(idx)) return prev;
                const n = new Set(prev);
                n.add(idx);
                return n;
              });
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        toast.error('Microphone access denied');
        setMicOn(false);
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    };
  }, [micOn, lines, audioRef]);

  const score = lines.length ? Math.round((hits.size / lines.length) * 100) : 0;

  const finish = async () => {
    if (!lines.length) {
      onClose();
      return;
    }
    try {
      await submit.mutateAsync({ score, lines_hit: hits.size, total_lines: lines.length });
      toast.success(`Final score: ${score}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save score');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-bold">Karaoke</div>
          <div className="text-sm text-muted-foreground">Score: <span className="text-primary font-bold">{score}</span> · {hits.size}/{lines.length}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={finish} aria-label="Close karaoke">
          <X className="h-5 w-5" />
        </Button>
      </header>

      {translations.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-border">
          <button
            onClick={() => setLang('original')}
            className={`px-3 py-1 rounded-full text-xs font-medium ${lang === 'original' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            Original
          </button>
          {translations.map((t) => (
            <button
              key={t.language}
              onClick={() => setLang(t.language)}
              className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${lang === t.language ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {t.language}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden px-4">
        <SyncedLyricsView
          lrcText={lrc}
          plainText={plain}
          currentTime={time}
          karaoke
          onSeek={(s) => {
            if (audioRef.current) audioRef.current.currentTime = s;
          }}
        />
      </div>

      {leaderboard.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Trophy className="h-3.5 w-3.5" /> Top scores
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {leaderboard.map((s, i) => (
              <div key={s.id} className="px-3 py-1 rounded-full bg-muted text-xs whitespace-nowrap">
                #{i + 1} · {s.score}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border flex gap-2">
        <Button
          variant={micOn ? 'default' : 'outline'}
          onClick={() => setMicOn((v) => !v)}
          className="flex-1 min-h-11"
        >
          {micOn ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
          {micOn ? 'Mic on' : 'Enable mic'}
        </Button>
        <Button onClick={finish} className="flex-1 min-h-11">
          Finish
        </Button>
      </div>
    </div>
  );
}
