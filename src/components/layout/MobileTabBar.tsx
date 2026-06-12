import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Users, DollarSign, Sparkles, Plus, X, Bot, Rocket, TrendingUp, QrCode, Ticket, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLiveCount } from "@/context/NetworkContext";
import CreateSheet from "@/components/CreateSheet";
import { safeNavPath, validateNavPaths } from "@/lib/routeRegistry";

interface MobileTabBarProps {
  onUploadVideo?: () => void;
}

export default function MobileTabBar({ onUploadVideo }: MobileTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [ariaOpen, setAriaOpen] = useState(false);
  const liveCount = useLiveCount();

  const communityPath = user ? `/community/${user.id}` : "/dashboard";

  const tabs = [
    { label: "Discover", icon: Search, path: "/discover" },
    { label: "Community", icon: Users, path: communityPath },
    { label: "create", icon: Plus, path: "" },
    { label: "Earn", icon: DollarSign, path: "/wallet" },
    { label: "ARIA", icon: Sparkles, path: "" },
  ];

  useEffect(() => {
    validateNavPaths(
      [...tabs.filter((t) => t.path), ...ariaActions],
      "MobileTabBar",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityPath]);

  const isActive = (path: string) => {
    if (!path) return false;
    const basePath = path.split("?")[0];
    const pathname = location.pathname;
    // Exact match or nested path
    if (pathname === basePath || pathname.startsWith(basePath + "/")) return true;
    // Community tab should also highlight for /space/* routes
    if (basePath.startsWith("/community/") && pathname.startsWith("/space/")) return true;
    // Earn tab should also highlight for nested wallet/earn routes
    if (basePath === "/wallet" && (pathname.startsWith("/wallet") || pathname === "/buy-credits" || pathname === "/affiliates")) return true;
    // Discover tab for nested discovery routes
    if (basePath === "/discover" && (pathname.startsWith("/discover") || pathname.startsWith("/creator/") || pathname.startsWith("/search"))) return true;
    return false;
  };

  const isAriaActive = ["/dashboard/ai-team", "/grow", "/launchpad", "/dashboard/content-studio", "/analytics", "/growth-reports", "/scan", "/tickets"].some(
    p => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  // Create actions are now rendered by <CreateSheet />.

  const actionGroups = [
    {
      title: "Events & Tickets",
      items: [
        { label: "My Tickets", icon: Ticket, path: "/tickets", desc: "Tickets, passes & resale" },
        { label: "My Events", icon: Calendar, path: "/events", desc: "Host & manage events" },
        { label: "Scan Tickets", icon: QrCode, path: "/scan", desc: "Check in attendees at the door" },
      ],
    },
    {
      title: "AI & Growth",
      items: [
        { label: "AI Team", icon: Bot, path: "/dashboard/ai-team", desc: "Your 5 AI agents" },
        { label: "Content Studio", icon: Sparkles, path: "/dashboard/content-studio", desc: "AI-generated content" },
        { label: "Grow", icon: TrendingUp, path: "/grow", desc: "Growth protocol tasks" },
        { label: "Launchpad", icon: Rocket, path: "/launchpad", desc: "Launch something new" },
      ],
    },
  ];
  const ariaActions = actionGroups.flatMap((g) => g.items);

  return (
    <>
      {/* Universal Create sheet */}
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* ARIA action sheet backdrop */}
      <AnimatePresence>
        {ariaOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setAriaOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ARIA action sheet */}
      <AnimatePresence>
        {ariaOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-16 left-0 right-0 z-[61] md:hidden bg-card border-t border-border rounded-t-2xl safe-area-bottom"
          >
            <div className="p-4 pb-2 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-foreground uppercase tracking-widest">Quick Actions</p>
                </div>
                <button onClick={() => setAriaOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {actionGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{group.title}</p>
                  {group.items.map((action) => {
                    const isCurrentPage = location.pathname === action.path;
                    return (
                      <button
                        key={action.label}
                        onClick={() => { setAriaOpen(false); navigate(safeNavPath(action.path)); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isCurrentPage ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCurrentPage ? "bg-primary/20" : "bg-primary/10"
                        }`}>
                          <action.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p>{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <nav
        aria-label="Mobile navigation"
        className="mobile-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border glass-panel safe-area-bottom transition-transform duration-200"
      >
        <div className="flex items-center justify-around h-16 px-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            // Center "+" create button
            if (tab.label === "create") {
              return (
                <button
                  key="create"
                  onClick={() => { setAriaOpen(false); setCreateOpen(true); }}
                  aria-label="Create"
                  className="relative flex items-center justify-center -mt-4"
                >
                  <motion.div
                    className="w-14 h-14 rounded-2xl bg-brand-gradient brand-glow flex items-center justify-center"
                    whileTap={{ scale: 0.92 }}
                    animate={{ rotate: createOpen ? 45 : 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  >
                    <Plus className="w-7 h-7 text-white" />
                  </motion.div>
                </button>
              );
            }

            // ARIA tab opens submenu
            if (tab.label === "ARIA") {
              return (
                <button
                  key="ARIA"
                  onClick={() => { setCreateOpen(false); setAriaOpen(!ariaOpen); }}
                  aria-label="ARIA"
                  role="tab"
                  aria-selected={isAriaActive}
                  className="relative flex flex-col items-center justify-center flex-1 py-1.5 tab-press group touch-target"
                >
                  <div className="relative">
                    {isAriaActive && (
                      <motion.div
                        layoutId="mobile-tab-indicator"
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-[10px] mt-0.5 text-primary font-semibold">ARIA</span>
                </button>
              );
            }

            const active = isActive(tab.path);
            return (
              <button
                key={tab.label}
                onClick={() => { setCreateOpen(false); setAriaOpen(false); navigate(safeNavPath(tab.path)); }}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                role="tab"
                aria-selected={active}
                className="relative flex flex-col items-center justify-center flex-1 py-1.5 tab-press group touch-target"
              >
                <div className="relative">
                  {active && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-sm bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {tab.label === "Discover" && liveCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  )}
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-0.5 transition-colors font-semibold ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
