import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";
import { safeNavPath, validateNavPaths } from "@/lib/routeRegistry";

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

  useEffect(() => {
    validateNavPaths(tabs, "SocialTopNav");
  }, []);

  const unreadSocialCount = (notifications || []).filter(
    (n) => !n.read && ["hey", "super_hey", "story_view"].includes(n.type)
  ).length;

  const unreadTotal = (notifications || []).filter((n) => !n.read).length;

  const isActive = (path: string) => {
    if (path === "/social") return location.pathname === "/social" || location.pathname === "/discover";
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="sticky top-14 z-30 w-full flex items-center"
      style={{
        backgroundColor: "#0A0A0A",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        height: 44,
        paddingRight: 8,
      }}
    >
      <div className="flex items-stretch flex-1" style={{ height: 44 }}>
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(safeNavPath(tab.path))}
            className="relative flex-1 flex items-center justify-center"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: isActive(tab.path) ? "#FFFFFF" : "rgba(255,255,255,0.35)",
              background: "transparent",
              border: "none",
            }}
          >
            {tab.label}

            {tab.label === "People" && unreadSocialCount > 0 && (
              <span
                className="absolute flex items-center justify-center"
                style={{
                  top: 8,
                  right: "calc(50% - 28px)",
                  minWidth: 18,
                  height: 18,
                  backgroundColor: "#FF3B30",
                  borderRadius: 9,
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  padding: "0 5px",
                }}
              >
                {unreadSocialCount > 99 ? "99+" : unreadSocialCount}
              </span>
            )}

            {isActive(tab.path) && (
              <span
                className="absolute"
                style={{
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60%",
                  maxWidth: 40,
                  height: 3,
                  backgroundColor: "#3D7CFF",
                  borderRadius: "2px 2px 0 0",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Notification bell */}
      <button
        onClick={() => navigate(safeNavPath("/notifications"))}
        className="relative flex items-center justify-center"
        style={{ width: 40, height: 40 }}
      >
        <Bell className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
        {unreadTotal > 0 && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              backgroundColor: "#FF3B30",
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 800,
              color: "#FFFFFF",
              padding: "0 4px",
            }}
          >
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>
    </div>
  );
}
