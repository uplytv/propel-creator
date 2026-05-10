import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '../../hooks/usePlayerStore';

export default function VolumeControl({ className = '' }: { className?: string }) {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setMuted = usePlayerStore((s) => s.setMuted);

  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={`hidden md:flex items-center gap-2 ${className}`}>
      <button
        onClick={() => setMuted(!muted)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="p-1.5 text-white/70 hover:text-white"
      >
        <Icon className="w-4 h-4" />
      </button>
      <div className="w-24">
        <Slider
          value={[muted ? 0 : volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(v) => setVolume(v[0])}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
