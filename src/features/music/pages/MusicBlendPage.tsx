import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useBlend } from '../hooks/useBlend';
import { usePlayerStore } from '../hooks/usePlayerStore';
import TrackRow from '../components/TrackRow';

export default function MusicBlendPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading } = useBlend(userId);
  const load = usePlayerStore((s) => s.loadTrack);

  if (isLoading) return <div className="p-8 text-white/50">Building your blend…</div>;
  if (!data)
    return (
      <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
        <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Music
        </Link>
        <div className="mt-12 text-center text-white/60">
          Not enough listening history to blend yet. Both of you need to play more tracks.
        </div>
      </div>
    );

  const partnerName = data.partner.displayName || data.partner.username || 'Friend';
  const playable = data.tracks.filter(
    (t) => t.audio_status === 'ready' && !!t.audio_mux_playback_id,
  );

  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>

      <div
        className="rounded-3xl p-6 mb-6 text-white relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(61, 124, 255,0.15), rgba(176,37,255,0.25), rgba(61,124,255,0.2))',
        }}
      >
        <div className="flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3" /> Blend
        </div>
        <h1 className="text-3xl sm:text-4xl font-black leading-tight">
          You + {partnerName}
        </h1>
        <p className="text-sm text-white/70 mt-2">
          {data.tracks.length} tracks · {data.sharedCount} you both love
        </p>
        {playable.length > 0 && (
          <button
            onClick={() => {
              const [first, ...rest] = playable;
              load(first, [first, ...rest]);
            }}
            className="mt-4 px-5 py-2.5 rounded-full bg-primary text-black font-bold text-sm"
          >
            Play blend
          </button>
        )}
      </div>

      <div className="space-y-1">
        {data.tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} queue={data.tracks} index={i} />
        ))}
      </div>
    </div>
  );
}
