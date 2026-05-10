import { EQ_FREQUENCIES } from '../hooks/usePlaybackPrefs';

/**
 * AudioGraph wires an HTMLAudioElement through a 10-band EQ + master gain
 * via WebAudio. Designed to be created once per <audio> element.
 */
export class AudioGraph {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  filters: BiquadFilterNode[];
  gain: GainNode;

  constructor(audio: HTMLAudioElement) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.ctx = new Ctx();
    this.source = this.ctx.createMediaElementSource(audio);
    this.filters = EQ_FREQUENCIES.map((freq, i) => {
      const f = this.ctx.createBiquadFilter();
      f.frequency.value = freq;
      if (i === 0) f.type = 'lowshelf';
      else if (i === EQ_FREQUENCIES.length - 1) f.type = 'highshelf';
      else { f.type = 'peaking'; f.Q.value = 1.0; }
      f.gain.value = 0;
      return f;
    });
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1;

    // chain: source -> filters... -> gain -> destination
    let prev: AudioNode = this.source;
    for (const f of this.filters) { prev.connect(f); prev = f; }
    prev.connect(this.gain);
    this.gain.connect(this.ctx.destination);
  }

  setBands(dBs: number[]) {
    this.filters.forEach((f, i) => {
      const v = dBs[i] ?? 0;
      f.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    });
  }

  /** Linear ramp gain over `seconds` */
  rampGain(target: number, seconds: number) {
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, target)), now + Math.max(0.01, seconds));
  }

  resume() {
    if (this.ctx.state === 'suspended') return this.ctx.resume();
    return Promise.resolve();
  }

  destroy() {
    try { this.source.disconnect(); } catch {}
    try { this.filters.forEach((f) => f.disconnect()); } catch {}
    try { this.gain.disconnect(); } catch {}
    try { this.ctx.close(); } catch {}
  }
}
