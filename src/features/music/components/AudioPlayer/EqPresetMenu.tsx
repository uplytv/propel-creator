import { SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePlayerStore, type EqPreset } from '../../hooks/usePlayerStore';

const OPTIONS: { id: EqPreset; label: string }[] = [
  { id: 'flat', label: 'Flat' },
  { id: 'bass-boost', label: 'Bass Boost' },
  { id: 'treble-boost', label: 'Treble Boost' },
  { id: 'vocal', label: 'Vocal' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'rock', label: 'Rock' },
];

export default function EqPresetMenu() {
  const eq = usePlayerStore((s) => s.eqPreset);
  const set = usePlayerStore((s) => s.setEqPreset);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Equalizer"
          className={`p-2 rounded-full ${eq !== 'flat' ? 'text-primary' : 'text-white/70 hover:text-white'}`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-44 p-1 bg-[#0A0A0A] border border-white/10 text-white"
      >
        <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-white/50">
          Equalizer
        </div>
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => set(o.id)}
            className={`w-full text-left px-2 py-2 text-sm rounded-md hover:bg-white/10 ${
              o.id === eq ? 'text-primary' : ''
            }`}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
