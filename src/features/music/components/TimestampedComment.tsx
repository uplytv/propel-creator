import { formatDuration } from '../lib/formatDuration';

export default function TimestampedComment({
  timestampSeconds,
  content,
  authorName,
  onSeek,
}: {
  timestampSeconds: number | null;
  content: string;
  authorName?: string;
  onSeek?: (s: number) => void;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-white/5">
      {timestampSeconds != null && onSeek && (
        <button
          onClick={() => onSeek(timestampSeconds)}
          className="text-xs font-mono px-2 py-0.5 rounded-md text-white"
          style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
        >
          {formatDuration(timestampSeconds)}
        </button>
      )}
      <div className="flex-1 min-w-0">
        {authorName && <div className="text-xs text-white/50">{authorName}</div>}
        <div className="text-sm text-white">{content}</div>
      </div>
    </div>
  );
}
