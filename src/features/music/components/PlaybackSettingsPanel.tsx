import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sliders, Waves, RotateCcw } from 'lucide-react';
import { EQ_FREQUENCIES, EQ_PRESETS, usePlaybackPrefs, type EqPreset } from '../hooks/usePlaybackPrefs';
import { cn } from '@/lib/utils';

const PRESETS: { key: EqPreset; label: string }[] = [
  { key: 'flat', label: 'Flat' },
  { key: 'bass-boost', label: 'Bass+' },
  { key: 'vocal', label: 'Vocal' },
  { key: 'rock', label: 'Rock' },
  { key: 'electronic', label: 'Electronic' },
  { key: 'acoustic', label: 'Acoustic' },
  { key: 'podcast', label: 'Podcast' },
];

function formatFreq(hz: number) {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export function PlaybackSettingsPanel() {
  const { prefs, setCrossfade, setGapless, setPreset, setBand, resetEq } = usePlaybackPrefs();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Playback</h2>
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-display font-bold">Crossfade</div>
                <p className="text-xs text-muted-foreground">Smoothly blend the end of one song into the next.</p>
              </div>
              <span className="font-display text-lg font-bold tabular-nums text-primary">
                {prefs.crossfadeSec === 0 ? 'Off' : `${prefs.crossfadeSec}s`}
              </span>
            </div>
            <Slider
              min={0}
              max={12}
              step={1}
              value={[prefs.crossfadeSec]}
              onValueChange={(v) => setCrossfade(v[0] ?? 0)}
            />
          </div>

          <div className="flex items-start justify-between gap-3 pt-2 border-t border-border">
            <div>
              <div className="font-display font-bold">Gapless playback</div>
              <p className="text-xs text-muted-foreground">No silence between tracks on albums and live mixes.</p>
            </div>
            <Switch checked={prefs.gapless} onCheckedChange={setGapless} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Equalizer</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={resetEq} className="text-xs">
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>

        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'shrink-0 rounded-full px-4 h-9 text-sm font-semibold transition border',
                prefs.eqPreset === p.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground/80 active:scale-95',
              )}
            >
              {p.label}
            </button>
          ))}
          {prefs.eqPreset === 'custom' && (
            <span className="shrink-0 self-center rounded-full border border-primary/40 bg-primary/10 px-3 h-9 grid place-items-center text-xs font-bold uppercase tracking-wider text-primary">
              Custom
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-10 gap-1 sm:gap-2">
          {EQ_FREQUENCIES.map((freq, i) => {
            const v = prefs.eqBands[i] ?? 0;
            return (
              <div key={freq} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold tabular-nums text-primary">
                  {v > 0 ? `+${v}` : v}
                </span>
                <Slider
                  orientation="vertical"
                  min={-12}
                  max={12}
                  step={1}
                  value={[v]}
                  onValueChange={(val) => setBand(i, val[0] ?? 0)}
                  className="h-32"
                />
                <span className="text-[10px] text-muted-foreground">{formatFreq(freq)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Range −12 dB to +12 dB · Preview applies to the next track
        </p>
      </section>
    </div>
  );
}
