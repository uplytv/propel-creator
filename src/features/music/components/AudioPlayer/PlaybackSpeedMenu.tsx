import { Gauge } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePlayerStore } from '../../hooks/usePlayerStore';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlaybackSpeedMenu() {
  const rate = usePlayerStore((s) => s.playbackRate);
  const setRate = usePlayerStore((s) => s.setPlaybackRate);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Playback speed"
          className={`p-2 rounded-full ${rate !== 1 ? 'text-[#3D7CFF]' : 'text-white/70 hover:text-white'}`}
        >
          <Gauge className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-40 p-1 bg-[#0A0A0A] border border-white/10 text-white"
      >
        <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-white/50">
          Speed
        </div>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setRate(s)}
            className={`w-full text-left px-2 py-2 text-sm rounded-md hover:bg-white/10 ${
              s === rate ? 'text-[#3D7CFF]' : ''
            }`}
          >
            {s}× {s === 1 && '(Normal)'}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
