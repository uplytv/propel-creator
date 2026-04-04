import { useStreamRecordings } from '@/hooks/useStreamRecordings';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RecentRecordingsRow({ creatorId }: { creatorId: string }) {
  const { data: recordings = [], isLoading: loading } = useStreamRecordings(creatorId);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (!recordings.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No recordings yet. Check back after a live stream!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {recordings.slice(0, 4).map(r => (
        <button
          key={r.id}
          onClick={() => navigate(`/stream/${r.id}?type=recording`)}
          className="aspect-video rounded-lg overflow-hidden bg-card border border-border cursor-pointer relative group text-left"
        >
          {r.playback_id ? (
            <img
              src={`https://image.mux.com/${r.playback_id}/thumbnail.jpg?width=320&height=180&time=2`}
              alt={r.title || 'Recording'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-xs font-medium text-white line-clamp-2 drop-shadow-sm">
              {r.title || 'Recording'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
