import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

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
    <div
      className="sticky top-0 z-40 w-full"
      style={{
        backgroundColor: "#0A0A0A",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 4px",
      }}
    >
      <div className="flex items-stretch" style={{ height: 44 }}>
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="relative flex-1 flex items-center justify-center cursor-pointer transition-colors duration-150"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: isActive(tab.path)
                ? "#FFFFFF"
                : "rgba(255,255,255,0.4)",
              background: "transparent",
              border: "none",
            }}
          >
            {tab.label}

            {/* Notification badge on People tab */}
            {tab.label === "People" && unreadSocialCount > 0 && (
              <span
                className="absolute flex items-center justify-center"
                style={{
                  top: 8,
                  right: "calc(50% - 22px)",
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
                {unreadSocialCount > 9 ? "9+" : unreadSocialCount}
              </span>
            )}

            {/* Active indicator */}
            {isActive(tab.path) && (
              <span
                className="absolute"
                style={{
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 3,
                  backgroundColor: "#00FF85",
                  borderRadius: "2px 2px 0 0",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
