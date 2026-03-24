import { useState, useCallback, useRef, useEffect } from 'react';

export interface SoundEffect {
  id: string;
  name: string;
  emoji: string;
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

const DEFAULT_SOUNDS: SoundEffect[] = [
  { id: 'airhorn', name: 'Air Horn', emoji: '📯', frequency: 600, duration: 0.8, type: 'sawtooth', volume: 0.3 },
  { id: 'ding', name: 'Ding', emoji: '🔔', frequency: 880, duration: 0.3, type: 'sine', volume: 0.4 },
  { id: 'drumroll', name: 'Drum Roll', emoji: '🥁', frequency: 200, duration: 1.5, type: 'triangle', volume: 0.3 },
  { id: 'tada', name: 'Ta-da!', emoji: '🎉', frequency: 523, duration: 0.6, type: 'sine', volume: 0.35 },
  { id: 'buzzer', name: 'Buzzer', emoji: '🚨', frequency: 150, duration: 0.5, type: 'square', volume: 0.2 },
  { id: 'whoosh', name: 'Whoosh', emoji: '💨', frequency: 400, duration: 0.4, type: 'sawtooth', volume: 0.15 },
  { id: 'pop', name: 'Pop', emoji: '💥', frequency: 1200, duration: 0.1, type: 'sine', volume: 0.4 },
  { id: 'laugh', name: 'Laugh Track', emoji: '😂', frequency: 350, duration: 1.0, type: 'triangle', volume: 0.25 },
  { id: 'crickets', name: 'Crickets', emoji: '🦗', frequency: 3000, duration: 2.0, type: 'sine', volume: 0.1 },
  { id: 'victory', name: 'Victory', emoji: '🏆', frequency: 660, duration: 0.8, type: 'sine', volume: 0.35 },
  { id: 'boo', name: 'Boo', emoji: '👻', frequency: 100, duration: 1.0, type: 'sawtooth', volume: 0.15 },
  { id: 'cashregister', name: 'Ka-Ching', emoji: '💰', frequency: 1500, duration: 0.3, type: 'sine', volume: 0.3 },
];

export function useCreatorSoundboard() {
  const [sounds] = useState<SoundEffect[]>(DEFAULT_SOUNDS);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [volume, setVolume] = useState(0.5);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback((sound: SoundEffect) => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = sound.type;
    osc.frequency.setValueAtTime(sound.frequency, ctx.currentTime);

    // Add some variation for more interesting sounds
    if (sound.id === 'airhorn') {
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + sound.duration);
    } else if (sound.id === 'tada') {
      osc.frequency.setValueAtTime(392, ctx.currentTime);
      osc.frequency.setValueAtTime(523, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.4);
    } else if (sound.id === 'victory') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.4);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.6);
    } else if (sound.id === 'whoosh') {
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + sound.duration);
    }

    gain.gain.setValueAtTime(sound.volume * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sound.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + sound.duration);

    setPlaying(sound.id);
    setTimeout(() => setPlaying(null), sound.duration * 1000);
  }, [getAudioContext, volume]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return { sounds, playing, playSound, volume, setVolume };
}
