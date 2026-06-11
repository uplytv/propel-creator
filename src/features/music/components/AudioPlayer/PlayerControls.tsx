import { Pause, Play, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { usePlayerStore, type RepeatMode } from '../../hooks/usePlayerStore';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showShuffleRepeat?: boolean;
}

export default function PlayerControls({ size = 'md', showShuffleRepeat = true }: Props) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const setRepeat = usePlayerStore((s) => s.setRepeat);

  const cycleRepeat = () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    setRepeat(order[(order.indexOf(repeatMode) + 1) % order.length]);
  };

  const playSize = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-9 h-9' : 'w-12 h-12';
  const iconSize = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div className="flex items-center justify-center gap-4">
      {showShuffleRepeat && (
        <button
          onClick={toggleShuffle}
          aria-label="Shuffle"
          className="p-2 transition"
          style={{ color: shuffle ? '#3D7CFF' : 'rgba(255,255,255,0.6)' }}
        >
          <Shuffle className="w-5 h-5" />
        </button>
      )}
      <button onClick={prev} aria-label="Previous" className="p-2 text-white/80 hover:text-white">
        <SkipBack className={iconSize} />
      </button>
      <button
        onClick={toggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={`${playSize} rounded-full flex items-center justify-center text-white shadow-lg`}
        style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
      >
        {isPlaying ? <Pause className={iconSize} /> : <Play className={`${iconSize} ml-0.5`} />}
      </button>
      <button onClick={next} aria-label="Next" className="p-2 text-white/80 hover:text-white">
        <SkipForward className={iconSize} />
      </button>
      {showShuffleRepeat && (
        <button
          onClick={cycleRepeat}
          aria-label={`Repeat ${repeatMode}`}
          className="p-2 transition"
          style={{ color: repeatMode !== 'off' ? '#3D7CFF' : 'rgba(255,255,255,0.6)' }}
        >
          {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
