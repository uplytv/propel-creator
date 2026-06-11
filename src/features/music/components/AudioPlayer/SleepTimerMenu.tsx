import { Moon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { useSleepTimer } from '../../hooks/useSleepTimer';

const PRESETS = [5, 10, 15, 30, 45, 60, 90];

export default function SleepTimerMenu() {
  const sleepEndOfTrack = usePlayerStore((s) => s.sleepEndOfTrack);
  const endsAt = usePlayerStore((s) => s.sleepTimerEndsAt);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const setSleepEndOfTrack = usePlayerStore((s) => s.setSleepEndOfTrack);
  const remaining = useSleepTimer();
  const active = !!endsAt || sleepEndOfTrack;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Sleep timer"
          className={`p-2 rounded-full ${active ? 'text-[#3D7CFF]' : 'text-white/70 hover:text-white'}`}
        >
          <Moon className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-56 p-2 bg-[#0A0A0A] border border-white/10 text-white"
      >
        <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-white/50">
          Sleep timer
        </div>
        {active && (
          <div className="px-2 py-1 text-xs text-[#3D7CFF]">
            {sleepEndOfTrack ? 'Stops after current track' : `Stops in ${remaining}`}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1 mt-1">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => setSleepTimer(m)}
              className="px-2 py-2 text-sm rounded-md hover:bg-white/10 text-left"
            >
              {m} min
            </button>
          ))}
        </div>
        <button
          onClick={() => setSleepEndOfTrack(true)}
          className="w-full mt-1 px-2 py-2 text-sm rounded-md hover:bg-white/10 text-left"
        >
          End of current track
        </button>
        {active && (
          <button
            onClick={() => setSleepTimer(null)}
            className="w-full mt-1 px-2 py-2 text-sm rounded-md hover:bg-white/10 text-left text-red-400"
          >
            Turn off
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
