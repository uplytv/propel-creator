import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, Sparkles, Music } from "lucide-react";
import { useMusicNotifications, useMarkNotificationsRead } from "../hooks/useMusicNotifications";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function MusicNotificationsPage() {
  const { data: items } = useMusicNotifications(50);
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if ((items?.length ?? 0) > 0) {
      markRead.mutate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length]);

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/music" className="p-2 rounded-full bg-white/5 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black text-white flex-1">Notifications</h1>
        <button
          onClick={() => markRead.mutate(undefined)}
          className="text-xs text-white/60 inline-flex items-center gap-1"
        >
          <CheckCheck className="w-4 h-4" /> Mark all read
        </button>
      </header>

      <div className="px-2">
        {!items?.length && (
          <div className="text-center py-16 text-white/40 flex flex-col items-center gap-2">
            <Bell className="w-8 h-8" />
            <p className="text-sm">No notifications yet — follow creators to hear about new drops.</p>
          </div>
        )}

        <ul className="divide-y divide-white/5">
          {items?.map((n) => {
            const Icon = n.type === "new_release" ? Music : Sparkles;
            const inner = (
              <div className={`flex items-start gap-3 p-3 ${!n.read_at ? "bg-white/[0.03]" : ""}`}>
                {n.cover_url ? (
                  <img src={n.cover_url} alt={n.title} loading="lazy" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white/60" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {n.body && <p className="text-xs text-white/60 truncate">{n.body}</p>}
                  <p className="text-[11px] text-white/40 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link_path ? (
                  <Link to={n.link_path} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
