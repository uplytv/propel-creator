import { Link } from 'react-router-dom';
import { ArrowLeft, Repeat2, Music2, Users } from 'lucide-react';
import { useActivityFeed } from '../hooks/useActivityFeed';
import TrackCard from '../components/TrackCard';

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function MusicFeedPage() {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useActivityFeed('following');
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="pb-32 px-4 pt-3 max-w-2xl mx-auto">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>
      <h1 className="text-2xl font-black text-white mt-2">Feed</h1>
      <p className="text-white/50 text-xs mb-4">From artists you follow.</p>

      {isLoading && <div className="text-white/40 text-sm">Loading…</div>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-10 rounded-2xl bg-white/[0.03] border border-white/5">
          <Users className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/70 text-sm">Follow artists to fill your feed.</p>
          <Link
            to="/music/browse"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-[#3D7CFF] text-black font-bold text-sm"
            style={{ minHeight: 44 }}
          >
            Browse music
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {items.map((ev) => {
          const ago = timeAgo(ev.created_at);
          const actorName = ev.actor?.display_name || ev.actor?.username || 'Someone';
          if (ev.event_type === 'track_uploaded' && ev.track) {
            return (
              <article key={ev.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                  <Music2 className="w-3 h-3" />
                  <span className="text-white font-semibold">@{ev.actor?.username ?? actorName}</span>
                  uploaded · {ago} ago
                </div>
                <div className="flex">
                  <TrackCard track={ev.track} />
                </div>
              </article>
            );
          }
          if (ev.event_type === 'track_reposted' && ev.track) {
            return (
              <article key={ev.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                  <Repeat2 className="w-3 h-3 text-[#3D7CFF]" />
                  <span className="text-white font-semibold">@{ev.actor?.username ?? actorName}</span>
                  reposted · {ago} ago
                </div>
                {ev.metadata?.note && (
                  <div className="text-sm text-white/80 mb-2">{ev.metadata.note}</div>
                )}
                <div className="flex">
                  <TrackCard track={ev.track} />
                </div>
              </article>
            );
          }
          return null;
        })}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full mt-4 py-3 rounded-full bg-white/5 text-white text-sm"
          style={{ minHeight: 44 }}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
