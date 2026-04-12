import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Home", path: "/social" },
  { label: "Local", path: "/social/local" },
  { label: "Friends", path: "/social/friends" },
  { label: "Producers", path: "/social/producers" },
  { label: "People", path: "/social/people" },
];

export default function SocialTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications } = useNotifications();

  const unreadSocialCount = (notifications || []).filter(
    (n) => !n.read && ["hey", "super_hey", "story_view"].includes(n.type)
  ).length;

  const isActive = (path: string) => {
    if (path === "/social") return location.pathname === "/social";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="sticky top-0 z-40 flex items-center gap-1 border-b px-4 overflow-x-auto scrollbar-hide"
      style={{
        backgroundColor: "#0A0A0A",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={cn(
            "relative whitespace-nowrap px-3 py-3 text-[13px] font-semibold transition-colors",
            isActive(tab.path)
              ? "text-white"
              : "text-white/40 hover:text-white/60"
          )}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {tab.label}
          {tab.label === "People" && unreadSocialCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadSocialCount > 99 ? "99+" : unreadSocialCount}
            </span>
          )}
          {isActive(tab.path) && (
            <span
              className="absolute bottom-0 left-3 right-3 h-[3px] rounded-sm"
              style={{ backgroundColor: "#00FF85" }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
