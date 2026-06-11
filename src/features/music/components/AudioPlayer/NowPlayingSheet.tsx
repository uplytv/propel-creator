import { ChevronDown, ListMusic, Music, Sparkles, Radio, ThumbsDown, X } from 'lucide-react';
import { trackEvent } from '@/lib/posthog';
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
import StartStationButton from '../StartStationButton';

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
  const station = usePlayerStore((s) => s.station);
  const stationTrackIds = usePlayerStore((s) => s.stationTrackIds);
  const stopStation = usePlayerStore((s) => s.stopStation);
  const excludeFromStation = usePlayerStore((s) => s.excludeFromStation);

  const [queueOpen, setQueueOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('now');

  const current = queue[currentIndex];
  const color = useColorExtraction(current?.cover_art_url ?? null);

  if (!open || !current) return null;

  const isStationTrack = !!station && stationTrackIds.includes(current.id);

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
            {station && (
              <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#3D7CFF]/15 text-[#3D7CFF] border border-[#3D7CFF]/30">
                <Radio className="w-3 h-3" />
                <span>Station{station.seedName ? ` · ${station.seedName}` : ''}</span>
                <button
                  onClick={() => stopStation()}
                  aria-label="Stop station"
                  className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-white/10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
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
                  autoplayRadio ? 'text-[#3D7CFF]' : 'text-white/70 hover:text-white'
                }`}
                title={autoplayRadio ? 'Autoplay on' : 'Autoplay off'}
              >
                <Radio className="w-5 h-5" />
              </button>
              {isStationTrack && (
                <button
                  onClick={() => {
                    trackEvent('station_thumbs_down', {
                      track_id: current.id,
                      station_seed_type: station?.seedType,
                      station_seed_id: station?.seedId,
                    });
                    excludeFromStation(current.id);
                  }}
                  aria-label="Not for me"
                  title="Not for me — don't play again on this station"
                  className="p-2 rounded-full text-white/70 hover:text-white"
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>
              )}
              <StartStationButton
                seed={{ seedType: 'track', seedId: current.id, seedName: current.title }}
                firstTrack={current}
                variant="icon"
                className="text-white/70 hover:text-white"
              />
              <SleepTimerMenu />
              <PlaybackSpeedMenu />
              <EqPresetMenu />
              <VolumeControl />
            </div>

            <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-white/60">
                <span>Crossfade</span>
                <span className="text-white/80">
                  {crossfadeSeconds === 0 ? 'Off' : `${crossfadeSeconds}s`}
                </span>
              </div>
              <Slider
                className="mt-2"
                value={[crossfadeSeconds]}
                min={0}
                max={12}
                step={1}
                onValueChange={(v) => setCrossfade(v[0])}
                aria-label="Crossfade seconds"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0, 3, 6, 9, 12].map((s) => (
                  <button
                    key={s}
                    onClick={() => setCrossfade(s)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      crossfadeSeconds === s
                        ? 'bg-[#3D7CFF] text-black border-[#3D7CFF]'
                        : 'border-white/15 text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {s === 0 ? 'Off' : `${s}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}
