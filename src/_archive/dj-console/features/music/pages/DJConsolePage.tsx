import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Disc3, Mic, Save, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DJEngine, type DeckId } from '../lib/djEngine';
import { useSaveDjSession } from '../hooks/useDjSessions';
import { toast } from 'sonner';

function DeckPanel({
  engine,
  deck,
  tick,
}: {
  engine: DJEngine;
  deck: DeckId;
  tick: number;
}) {
  const [url, setUrl] = useState('');
  const [bpm, setBpm] = useState('');
  const [rate, setRate] = useState(100);
  const state = engine.state[deck];

  const load = () => {
    if (!url) return;
    engine.load(deck, url, { title: url.split('/').pop() ?? 'Track', bpm: Number(bpm) || undefined });
    setRate(100);
  };

  return (
    <Card className="p-3 bg-card/40 border-border/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc3
            className={`w-5 h-5 text-primary ${state.playing ? 'animate-spin' : ''}`}
            style={{ animationDuration: '2s' }}
          />
          <span className="font-bold text-lg">Deck {deck}</span>
        </div>
        {state.bpm && <Badge variant="outline">{state.bpm.toFixed(0)} BPM</Badge>}
      </div>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Audio URL"
          className="text-base"
        />
        <Input
          value={bpm}
          onChange={(e) => setBpm(e.target.value)}
          placeholder="BPM"
          className="w-20 text-base"
          inputMode="numeric"
        />
        <Button onClick={load} size="sm" className="min-h-[44px]">
          Load
        </Button>
      </div>

      {state.title && (
        <p className="text-xs truncate text-muted-foreground" title={state.title}>
          ▸ {state.title}
        </p>
      )}

      <div className="flex justify-center">
        <Button
          size="icon"
          disabled={!state.loaded}
          onClick={() => (state.playing ? engine.pause(deck) : engine.play(deck))}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
        >
          {state.playing ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current" />
          )}
        </Button>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Tempo</span>
          <span>{rate}%</span>
        </div>
        <Slider
          value={[rate]}
          min={70}
          max={130}
          step={1}
          onValueChange={(v) => {
            setRate(v[0]);
            engine.setRate(deck, v[0] / 100);
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['low', 'mid', 'high'] as const).map((band) => (
          <EqKnob key={band} band={band} engine={engine} deck={deck} />
        ))}
      </div>
      <span className="hidden">{tick}</span>
    </Card>
  );
}

function EqKnob({
  band,
  engine,
  deck,
}: {
  band: 'low' | 'mid' | 'high';
  engine: DJEngine;
  deck: DeckId;
}) {
  const [v, setV] = useState(0);
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span className="uppercase">{band}</span>
        <span>{v > 0 ? '+' : ''}{v}dB</span>
      </div>
      <Slider
        value={[v]}
        min={-24}
        max={12}
        step={1}
        onValueChange={(val) => {
          setV(val[0]);
          engine.setEq(deck, band, val[0]);
        }}
      />
    </div>
  );
}

export function DJConsolePage() {
  const engineRef = useRef<DJEngine | null>(null);
  const [, setTick] = useState(0);
  const [crossfade, setCrossfade] = useState(50);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const startedAt = useRef<number | null>(null);
  const save = useSaveDjSession();

  if (!engineRef.current && typeof window !== 'undefined') {
    engineRef.current = new DJEngine();
  }
  const engine = engineRef.current!;

  // 250ms re-render for vinyl spin / state sync
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => engine?.destroy(), [engine]);

  const beatMatch = () => {
    engine.beatMatchToA();
    toast.success('Beat-matched B → A');
  };

  const toggleRecording = async () => {
    if (recording) {
      const blob = await engine.stopRecording();
      setRecording(false);
      setRecordedBlob(blob);
      toast.success('Mix recorded — ready to save');
    } else {
      engine.startRecording();
      startedAt.current = Date.now();
      setRecording(true);
      toast('🔴 Recording mix');
    }
  };

  const saveMix = async () => {
    if (!recordedBlob || !title) {
      toast.error('Add a title and stop recording first');
      return;
    }
    const duration = startedAt.current
      ? Math.floor((Date.now() - startedAt.current) / 1000)
      : 0;
    // Upload blob to Supabase Storage (uses default 'media' bucket if available)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user?.id}/dj-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, recordedBlob, { contentType: recordedBlob.type });
      let recording_url: string | undefined;
      if (!upErr) {
        const { data } = supabase.storage.from('media').getPublicUrl(path);
        recording_url = data.publicUrl;
      }
      await save.mutateAsync({
        title,
        duration_seconds: duration,
        recording_url,
        is_public: true,
      });
      toast.success('Mix saved 🎧');
      setRecordedBlob(null);
      setTitle('');
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    }
  };

  return (
    <div className="mobile-safe-content min-h-screen p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Headphones className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">DJ Console</h1>
        {recording && (
          <Badge className="bg-red-500 text-white animate-pulse ml-auto">REC</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DeckPanel engine={engine} deck="A" tick={0} />
        <DeckPanel engine={engine} deck="B" tick={0} />
      </div>

      <Card className="p-4 bg-card/40 border-border/40 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>A</span>
          <span>Crossfader</span>
          <span>B</span>
        </div>
        <Slider
          value={[crossfade]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => {
            setCrossfade(v[0]);
            engine.setCrossfade(v[0] / 100);
          }}
        />
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={beatMatch}
            className="rounded-full min-h-[44px]"
          >
            Beat-match B → A
          </Button>
          <Button
            variant={recording ? 'destructive' : 'default'}
            size="sm"
            onClick={toggleRecording}
            className="rounded-full min-h-[44px]"
          >
            <Mic className="w-4 h-4 mr-1" />
            {recording ? 'Stop' : 'Record mix'}
          </Button>
        </div>
      </Card>

      {recordedBlob && (
        <Card className="p-4 bg-card/40 border-primary/40 space-y-2">
          <p className="font-semibold text-sm">Save this mix</p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mix title"
            className="text-base"
          />
          <Button onClick={saveMix} className="w-full min-h-[44px]">
            <Save className="w-4 h-4 mr-2" /> Save & publish
          </Button>
        </Card>
      )}
    </div>
  );
}

export default DJConsolePage;
