/**
 * DJ engine: dual-deck Web Audio mixer with crossfader, tempo control,
 * 3-band EQ stub, and master gain.
 */
export type DeckId = 'A' | 'B';

export interface DeckState {
  url: string | null;
  title: string | null;
  bpm: number | null;
  loaded: boolean;
  playing: boolean;
  rate: number; // 1.0 = original
}

export class DJEngine {
  ctx: AudioContext;
  master: GainNode;
  recordDest: MediaStreamAudioDestinationNode;
  decks: Record<DeckId, {
    audio: HTMLAudioElement;
    src: MediaElementAudioSourceNode;
    gain: GainNode;
    eqLow: BiquadFilterNode;
    eqMid: BiquadFilterNode;
    eqHigh: BiquadFilterNode;
  }>;
  state: Record<DeckId, DeckState> = {
    A: { url: null, title: null, bpm: null, loaded: false, playing: false, rate: 1 },
    B: { url: null, title: null, bpm: null, loaded: false, playing: false, rate: 1 },
  };
  // 0 = full A, 1 = full B
  crossfade = 0.5;

  recorder: MediaRecorder | null = null;
  chunks: Blob[] = [];

  constructor() {
    const Ctx =
      (window as any).AudioContext ||
      (window as any).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.recordDest = this.ctx.createMediaStreamDestination();
    this.master.connect(this.ctx.destination);
    this.master.connect(this.recordDest);

    this.decks = {
      A: this.buildDeck(),
      B: this.buildDeck(),
    };
    this.applyCrossfade();
  }

  private buildDeck() {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    const src = this.ctx.createMediaElementSource(audio);
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 200;
    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 0.7;
    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;

    src.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(gain);
    gain.connect(this.master);

    return { audio, src, eqLow, eqMid, eqHigh, gain };
  }

  load(deck: DeckId, url: string, opts?: { title?: string; bpm?: number }) {
    const d = this.decks[deck];
    d.audio.src = url;
    d.audio.load();
    this.state[deck] = {
      url,
      title: opts?.title ?? null,
      bpm: opts?.bpm ?? null,
      loaded: true,
      playing: false,
      rate: this.state[deck].rate,
    };
  }

  async play(deck: DeckId) {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    await this.decks[deck].audio.play();
    this.state[deck].playing = true;
  }

  pause(deck: DeckId) {
    this.decks[deck].audio.pause();
    this.state[deck].playing = false;
  }

  setRate(deck: DeckId, rate: number) {
    this.decks[deck].audio.playbackRate = rate;
    // preservesPitch is supported in modern browsers
    (this.decks[deck].audio as any).preservesPitch = true;
    this.state[deck].rate = rate;
  }

  // Beat-match: adjust deck B rate so its BPM matches deck A
  beatMatchToA() {
    const a = this.state.A.bpm;
    const b = this.state.B.bpm;
    if (!a || !b) return;
    this.setRate('B', a / b);
  }

  setEq(deck: DeckId, band: 'low' | 'mid' | 'high', dbGain: number) {
    const d = this.decks[deck];
    const node = band === 'low' ? d.eqLow : band === 'mid' ? d.eqMid : d.eqHigh;
    node.gain.value = dbGain; // -24..+12 dB
  }

  setCrossfade(value: number) {
    this.crossfade = Math.max(0, Math.min(1, value));
    this.applyCrossfade();
  }

  // Equal-power crossfade
  private applyCrossfade() {
    const x = this.crossfade;
    const aGain = Math.cos((x * Math.PI) / 2);
    const bGain = Math.cos(((1 - x) * Math.PI) / 2);
    this.decks.A.gain.gain.value = aGain;
    this.decks.B.gain.gain.value = bGain;
  }

  setMaster(value: number) {
    this.master.gain.value = Math.max(0, Math.min(1, value));
  }

  startRecording() {
    if (this.recorder) return;
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
    this.recorder = new MediaRecorder(
      this.recordDest.stream,
      mime ? { mimeType: mime } : undefined,
    );
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
  }

  async stopRecording(): Promise<Blob | null> {
    const r = this.recorder;
    if (!r) return null;
    return await new Promise((resolve) => {
      r.onstop = () => {
        const blob = new Blob(this.chunks, { type: r.mimeType || 'audio/webm' });
        this.recorder = null;
        this.chunks = [];
        resolve(blob);
      };
      r.stop();
    });
  }

  destroy() {
    Object.values(this.decks).forEach((d) => {
      try {
        d.audio.pause();
      } catch {}
    });
    try {
      this.ctx.close();
    } catch {}
  }
}
