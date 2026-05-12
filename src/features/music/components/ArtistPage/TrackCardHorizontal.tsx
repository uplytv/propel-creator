import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicTrackPlayer from './PublicTrackPlayer';
import { usePlayerStore } from '../../hooks/usePlayerStore';

interface Props {
  track: any;
  queue?: any[];
  mode: 'public' | 'app';
}

export default function TrackCardHorizontal({ track, queue, mode }: Props) {
  const loadTrack = usePlayerStore((s) => (s as any).loadTrack);
  const credit = track.label || track.artist_name || '';

  const playInApp = () => {
    if (loadTrack) loadTrack(track, queue ?? [track]);
  };

  return (
    <div
      className="flex-shrink-0 snap-start w-[420px] max-w-[85vw] rounded-2xl p-4 flex gap-4 items-center transition"
      style={{ background: 'var(--bg-card)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
    >
      {track.cover_art_url ? (
        <img
          src={track.cover_art_url}
          alt={track.title}
          className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-[120px] h-[120px] rounded-lg flex-shrink-0" style={{ background: 'var(--bg-card-hover)' }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[18px] font-semibold mb-1 line-clamp-1">{track.title}</div>
        {credit && (
          <div className="text-[14px] line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>
            {credit}
          </div>
        )}
        {mode === 'public' ? (
          <PublicTrackPlayer playbackId={track.audio_mux_playback_id} />
        ) : (
          <button
            type="button"
            onClick={playInApp}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-semibold transition"
            style={{ border: '1px solid var(--text)' }}
          >
            <Play className="w-4 h-4" /> Play
          </button>
        )}
      </div>
    </div>
  );
}
