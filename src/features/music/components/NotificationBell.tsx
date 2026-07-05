import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUnreadMusicCount } from "../hooks/useMusicNotifications";

export default function NotificationBell() {
  const { data: count } = useUnreadMusicCount();
  const unread = count ?? 0;
  return (
    <Link
      to="/music/notifications"
      className="relative p-2 rounded-full bg-white/5 text-white"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-black text-[10px] font-bold flex items-center justify-center px-1">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
