import { useEffect, useRef } from 'react';
import { EQ_PRESETS, usePlayerStore, type EqPreset } from './usePlayerStore';

/**
 * Wires a 3-band BiquadFilter graph onto the audio element.
 * Call once with a ref to the <audio> element.
 */
export function useEqualizer(audioRef: React.RefObject<HTMLAudioElement>) {
  const eqPreset = usePlayerStore((s) => s.eqPreset);
  const ctxRef = useRef<AudioContext | null>(null);
  const filtersRef = useRef<{
    low: BiquadFilterNode;
    mid: BiquadFilterNode;
    high: BiquadFilterNode;
  } | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (ctxRef.current) return; // already wired

    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx() as AudioContext;
      const source = ctx.createMediaElementSource(a);
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 200;
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      const high = ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 4000;

      source.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(ctx.destination);

      ctxRef.current = ctx;
      sourceRef.current = source;
      filtersRef.current = { low, mid, high };
    } catch {
      // some browsers (or already-connected sources) will throw — fail silently
    }
  }, [audioRef]);

  useEffect(() => {
    const f = filtersRef.current;
    if (!f) return;
    const preset = EQ_PRESETS[eqPreset as EqPreset] ?? EQ_PRESETS.flat;
    f.low.gain.value = preset.low;
    f.mid.gain.value = preset.mid;
    f.high.gain.value = preset.high;
  }, [eqPreset]);

  // Resume audio context after user gesture
  useEffect(() => {
    function resume() {
      ctxRef.current?.resume?.().catch(() => {});
    }
    document.addEventListener('click', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
    return () => {
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
  }, []);
}
