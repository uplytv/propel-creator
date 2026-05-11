import { ChevronDown, ListMusic, Music, Sparkles, Radio } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { useColorExtraction } from '../../hooks/useColorExtraction';
import { formatDuration } from '../../lib/formatDuration';
import PlayerControls from './PlayerControls';
import VolumeControl from './VolumeControl';
import LikeButton from '../LikeButton';
import RepostButton from '../RepostButton';
import QueueDrawer from './QueueDrawer';
import LyricsPanel from './LyricsPanel';
import SleepTimerMenu from './SleepTimerMenu';
import PlaybackSpeedMenu from './PlaybackSpeedMenu';
import EqPresetMenu from './EqPresetMenu';

type Tab = 'now' | 'lyrics';

export default function NowPlayingSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionSeconds = usePlayerStore((s) => s.positionSeconds);
  const durationSeconds = usePlayerStore((s) => s.durationSeconds);
  const seek = usePlayerStore((s) => s.seek);
  const autoplayRadio = usePlayerStore((s) => s.autoplayRadio);
  const setAutoplayRadio = usePlayerStore((s) => s.setAutoplayRadio);
  const crossfadeSeconds = usePlayerStore((s) => s.crossfadeSeconds);
  const setCrossfade = usePlayerStore((s) => s.setCrossfade);

  const [queueOpen, setQueueOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('now');

  const current = queue[currentIndex];
  const color = useColorExtraction(current?.cover_art_url ?? null);

  if (!open || !current) return null;

  const bgGradient = color
    ? `radial-gradient(ellipse at top, hsl(${color.h} ${Math.min(80, color.s)}% ${Math.min(35, color.l + 10)}%) 0%, #0A0A0A 70%)`
    : 'radial-gradient(ellipse at top,#1a1030 0%,#0A0A0A 70%)';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-label="Now playing"
      style={{ background: bgGradient, transition: 'background 400ms ease' }}
    >
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <button
          onClick={onClose}
          aria-label="Minimize"
          className="p-2 text-white/80 hover:text-white"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50">
          <button
            onClick={() => setTab('now')}
            className={`px-3 py-1 rounded-full ${tab === 'now' ? 'bg-white/10 text-white' : ''}`}
          >
            <Music className="inline w-3 h-3 mr-1" /> Now
          </button>
          <button
            onClick={() => setTab('lyrics')}
            className={`px-3 py-1 rounded-full ${tab === 'lyrics' ? 'bg-white/10 text-white' : ''}`}
          >
            <Sparkles className="inline w-3 h-3 mr-1" /> Lyrics
          </button>
        </div>
        <button
          onClick={() => setQueueOpen(true)}
          aria-label="Queue"
          className="p-2 text-white/80 hover:text-white"
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {tab === 'lyrics' ? (
        <div className="flex-1 overflow-hidden">
          <LyricsPanel trackId={current.id} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 overflow-hidden">
          <div
            className="w-full max-w-xs aspect-square rounded-3xl shadow-2xl"
            style={{
              background: current.cover_art_url
                ? `url(${current.cover_art_url}) center/cover`
                : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
              boxShadow: color
                ? `0 30px 60px -20px hsl(${color.h} ${color.s}% ${Math.max(20, color.l)}% / 0.6)`
                : '0 30px 60px -20px rgba(61,124,255,0.5)',
              transform: isPlaying ? 'scale(1)' : 'scale(0.92)',
              transition: 'transform 400ms ease, box-shadow 400ms ease',
            }}
          />

          <div className="w-full max-w-md mt-6 px-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/music/track/${current.id}`}
                  onClick={onClose}
                  className="block text-2xl font-bold text-white truncate hover:underline"
                >
                  {current.title}
                </Link>
                <div className="text-sm text-white/60 truncate">{current.genre || 'Music'}</div>
              </div>
              <RepostButton trackId={current.id} />
              <LikeButton trackId={current.id} />
            </div>

            <div className="mt-5">
              <Slider
                value={[Math.min(positionSeconds, durationSeconds || 0)]}
                min={0}
                max={Math.max(durationSeconds, 1)}
                step={0.5}
                onValueChange={(v) => seek(v[0])}
                aria-label="Seek"
              />
              <div className="flex justify-between text-[11px] text-white/50 mt-1.5">
                <span>{formatDuration(positionSeconds)}</span>
                <span>-{formatDuration(Math.max(0, durationSeconds - positionSeconds))}</span>
              </div>
            </div>

            <div className="mt-5">
              <PlayerControls size="lg" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => setAutoplayRadio(!autoplayRadio)}
                aria-label="Autoplay radio"
                className={`p-2 rounded-full ${
                  autoplayRadio ? 'text-[#00FF85]' : 'text-white/70 hover:text-white'
                }`}
                title={autoplayRadio ? 'Autoplay on' : 'Autoplay off'}
              >
                <Radio className="w-5 h-5" />
              </button>
              <SleepTimerMenu />
              <PlaybackSpeedMenu />
              <EqPresetMenu />
              <VolumeControl />
            </div>
          </div>
        </div>
      )}

      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}
