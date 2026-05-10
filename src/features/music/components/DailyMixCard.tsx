import { Play, Sparkles } from 'lucide-react';
import type { Track } from '../types';
import { usePlayerStore } from '../hooks/usePlayerStore';

interface Props {
  title: string;
  subtitle: string;
  tracks: Track[];
  /** 4 cover art urls used to make a mosaic. */
  covers?: (string | null)[];
}

export default function DailyMixCard({ title, subtitle, tracks, covers }: Props) {
  const load = usePlayerStore((s) => s.loadTrack);
  const playable = tracks.filter(
    (t) => t.audio_status === 'ready' && !!t.audio_mux_playback_id,
  );
  const tiles = (covers ?? tracks.slice(0, 4).map((t) => t.cover_art_url)).slice(0, 4);
  while (tiles.length < 4) tiles.push(null);

  return (
    <div className="group relative w-44 sm:w-48 flex-shrink-0">
      <div className="relative aspect-square rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-px bg-white/5">
        {tiles.map((src, i) => (
          <div
            key={i}
            className="w-full h-full"
            style={{
              background: src
                ? `url(${src}) center/cover`
                : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40 flex flex-col justify-between p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/80 font-bold">
            <Sparkles className="w-3 h-3" /> Made for you
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">{title}</div>
            <div className="text-white/70 text-xs truncate">{subtitle}</div>
          </div>
        </div>
        {playable.length > 0 && (
          <button
            onClick={() => {
              const [first, ...rest] = playable;
              load(first, [first, ...rest]);
            }}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition"
            aria-label={`Play ${title}`}
          >
            <Play className="w-5 h-5 fill-black ml-0.5" />
          </button>
        )}
      </div>
      <div className="mt-2 text-xs text-white/60 px-1">
        {playable.length} tracks
      </div>
    </div>
  );
}
