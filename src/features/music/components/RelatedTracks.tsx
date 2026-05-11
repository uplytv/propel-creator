import TrackCard from './TrackCard';
import { useRelatedTracks } from '../hooks/useRelatedTracks';
import { useTrack } from '../hooks/useTrack';

export default function RelatedTracks({ trackId }: { trackId: string }) {
  const { data: track } = useTrack(trackId);
  const { data: related = [] } = useRelatedTracks(track);

  if (!related.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-white mb-3">Related tracks</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {related.map((t) => (
          <TrackCard key={t.id} track={t} queue={related} />
        ))}
      </div>
    </section>
  );
}
