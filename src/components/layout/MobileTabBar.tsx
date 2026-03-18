import { useLocation, useNavigate } from "react-router-dom";
import { Search, Home, Radio, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";

const tabs = [
  { label: "Discover", icon: Search, path: "/discover" },
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Live", icon: Radio, path: "/live" },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Profile", icon: User, path: "__profile__" },
];

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useApp();

  const resolvePath = (path: string) =>
    path === "__profile__" ? (user ? `/community/${user.id}` : "/auth") : path;

  return (
    <nav aria-label="Mobile navigation" className="mobile-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-area-bottom transition-transform duration-200">
      <div className="flex items-center justify-around h-14 px-1" role="tablist">
        {tabs.map((tab) => {
          const resolved = resolvePath(tab.path);
          const isActive = location.pathname === resolved || 
            (tab.path === "/live" && location.pathname.startsWith("/live")) ||
            (tab.path === "/discover" && location.pathname.startsWith("/discover"));

          return (
            <button
              key={tab.label}
              onClick={() => navigate(resolved)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              role="tab"
              aria-selected={isActive}
              className="relative flex flex-col items-center justify-center flex-1 py-1.5 tab-press group touch-target"
            >
              <div className="relative">
                {tab.path === "__profile__" && profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className={`w-6 h-6 rounded-full object-cover transition-all ${
                      isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "opacity-60 group-hover:opacity-100"
                    }`}
                  />
                ) : (
                  <tab.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
