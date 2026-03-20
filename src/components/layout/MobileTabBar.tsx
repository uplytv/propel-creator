import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, BarChart3, DollarSign, Users, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const cores = [
  {
    label: "Create",
    icon: Camera,
    sub: [
      { label: "Go Live", path: "/go-live" },
      { label: "Content Library", path: "/content-library" },
      { label: "Scheduled Streams", path: "/go-live?tab=schedule" },
      { label: "Events", path: "/events" },
    ],
  },
  {
    label: "Grow",
    icon: BarChart3,
    sub: [
      { label: "Discover", path: "/discover" },
      { label: "Analytics", path: "/analytics" },
      { label: "Leaderboard", path: "/leaderboard" },
      { label: "Affiliates", path: "/affiliates" },
      { label: "Grow Tasks", path: "/grow" },
    ],
  },
  {
    label: "Earn",
    icon: DollarSign,
    sub: [
      { label: "Wallet", path: "/wallet" },
      { label: "Products", path: "/products" },
      { label: "Buy Credits", path: "/buy-credits" },
      { label: "Subscriptions", path: "/settings?tab=subscriptions" },
    ],
  },
  {
    label: "Community",
    icon: Users,
    sub: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Notifications", path: "/notifications" },
      { label: "Messages", path: "/messages" },
      { label: "Jobs", path: "/jobs" },
      { label: "Settings", path: "/settings" },
    ],
  },
  {
    label: "ARIA",
    icon: Sparkles,
    sub: [
      { label: "ARIA Chat", path: "/dashboard?mode=ai" },
      { label: "Growth Reports", path: "/growth-reports" },
      { label: "My Rep", path: "/my-rep" },
    ],
  },
];

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openDrawer, setOpenDrawer] = useState<number | null>(null);

  const isInCore = (coreIdx: number) =>
    cores[coreIdx].sub.some((s) => location.pathname === s.path || location.pathname.startsWith(s.path.split("?")[0]));

  return (
    <>
      {/* Sub-menu drawer */}
      <AnimatePresence>
        {openDrawer !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setOpenDrawer(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-16 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-2xl max-h-[50vh] overflow-y-auto safe-area-bottom"
            >
              <div className="p-4 space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  {cores[openDrawer].label}
                </p>
                {cores[openDrawer].sub.map((item) => {
                  const basePath = item.path.split("?")[0];
                  const isActive = location.pathname === basePath;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setOpenDrawer(null);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <nav
        aria-label="Mobile navigation"
        className="mobile-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-area-bottom transition-transform duration-200"
      >
        <div className="flex items-center justify-around h-16 px-1" role="tablist">
          {cores.map((core, idx) => {
            const isActive = isInCore(idx);
            const Icon = core.icon;
            return (
              <button
                key={core.label}
                onClick={() => {
                  if (openDrawer === idx) {
                    setOpenDrawer(null);
                  } else {
                    setOpenDrawer(idx);
                  }
                }}
                aria-label={core.label}
                aria-current={isActive ? "page" : undefined}
                role="tab"
                aria-selected={isActive}
                className="relative flex flex-col items-center justify-center flex-1 py-1.5 tab-press group touch-target"
              >
                <div className="relative">
                  {/* Active indicator dot above icon */}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      core.label === "ARIA"
                        ? "text-primary"
                        : isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-0.5 transition-colors ${
                    core.label === "ARIA"
                      ? "text-primary font-semibold"
                      : isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground font-medium"
                  }`}
                >
                  {core.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
