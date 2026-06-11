import { Link } from 'react-router-dom';
import { Play, Heart, Repeat2, Headphones, Users, Sparkles } from 'lucide-react';
import { useFriendActivity, type FriendActivity } from '../hooks/useFriendActivity';
import { usePlayerStore } from '../hooks/usePlayerStore';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function verbFor(type: FriendActivity['type']) {
  switch (type) {
    case 'liked':
      return { icon: Heart, label: 'liked', color: 'text-pink-400' };
    case 'reposted':
      return { icon: Repeat2, label: 'reposted', color: 'text-[#3D7CFF]' };
    case 'played':
      return { icon: Headphones, label: 'is listening to', color: 'text-blue-400' };
  }
}

function ActivityCard({ activity, queue }: { activity: FriendActivity; queue: FriendActivity[] }) {
  const load = usePlayerStore((s) => s.loadTrack);
  const { icon: Icon, label, color } = verbFor(activity.type);
  const t = activity.track;
  const playable = t.audio_status === 'ready' && !!t.audio_mux_playback_id;
  const actorName = activity.actor.displayName || activity.actor.username || 'A friend';

  return (
    <div className="w-64 flex-shrink-0 rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to={
            activity.actor.username
              ? `/${activity.actor.username}`
              : `/profile/${activity.actor.id}`
          }
          className="flex items-center gap-2 min-w-0"
        >
          {activity.actor.avatarUrl ? (
            <img
              src={activity.actor.avatarUrl}
              alt={actorName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
            >
              {actorName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="text-xs text-white truncate font-semibold max-w-[110px]">
            {actorName}
          </div>
        </Link>
        <div className={`flex items-center gap-1 text-[11px] ${color}`}>
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <div className="ml-auto text-[10px] text-white/40">{timeAgo(activity.occurredAt)}</div>
      </div>

      <Link to={`/music/track/${t.id}`} className="block">
        <div
          className="relative w-full aspect-square rounded-lg overflow-hidden"
          style={{
            background: t.cover_art_url
              ? `url(${t.cover_art_url}) center/cover`
              : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
          }}
        >
          {playable && (
            <button
              onClick={(e) => {
                e.preventDefault();
                const playableQueue = queue
                  .map((a) => a.track)
                  .filter(
                    (x) => x.audio_status === 'ready' && !!x.audio_mux_playback_id,
                  );
                load(t, playableQueue);
              }}
              className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
              aria-label={`Play ${t.title}`}
            >
              <Play className="w-4 h-4 fill-black ml-0.5" />
            </button>
          )}
        </div>
      </Link>

      <div className="px-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{t.title}</div>
          <div className="text-xs text-white/50 truncate">{t.genre ?? 'Music'}</div>
        </div>
        <Link
          to={`/music/blend/${activity.actor.id}`}
          className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3D7CFF] hover:text-white"
        >
          <Sparkles className="w-3 h-3" /> Blend
        </Link>
      </div>
    </div>
  );
}

export default function FriendActivityRail() {
  const { data, isLoading } = useFriendActivity(30);
  if (isLoading || !data || data.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-4">
        <Users className="w-5 h-5 text-white" />
        <h2 className="text-lg font-bold text-white">Friend Activity</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
        {data.map((a, i) => (
          <ActivityCard key={`${a.type}-${a.actor.id}-${a.track.id}-${i}`} activity={a} queue={data} />
        ))}
      </div>
    </section>
  );
}
