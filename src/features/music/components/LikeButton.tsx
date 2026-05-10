import { Heart } from 'lucide-react';
import { useLikeTrack } from '../hooks/useLikeTrack';

export default function LikeButton({ trackId }: { trackId: string }) {
  const { liked, toggle, loading } = useLikeTrack(trackId);
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="p-2 rounded-full hover:bg-white/10"
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <Heart
        className={`w-5 h-5 ${liked ? 'fill-current' : ''}`}
        style={{ color: liked ? '#B025FF' : 'rgba(255,255,255,0.7)' }}
      />
    </button>
  );
}
