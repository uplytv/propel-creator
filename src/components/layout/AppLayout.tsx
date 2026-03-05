import { ReactNode, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Rocket, Package, Users, UserCheck, Lock, Share2,
  LogOut, Settings, ChevronLeft, ChevronRight, Shield, TrendingUp,
  Zap, Crown, Sparkles, BarChart3, Trophy, Handshake, Radio, Plug, Briefcase, MessageSquare, Bell as BellIcon
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useApp, tierNames } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useUnreadMessageCount } from "@/hooks/useCollaborations";
import { useUnreadJobMessageCount } from "@/hooks/useJobMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard", desc: "Overview & metrics" },
  { label: "Live", icon: Radio, path: "/live", desc: "Watch & stream live" },
  { label: "Grow", icon: Rocket, path: "/grow", desc: "Launch Protocol" },
  { label: "Products", icon: Package, path: "/products", desc: "What you sell" },
  { label: "Community", icon: Users, path: "/community", desc: "Your audience" },
  { label: "Affiliates", icon: Share2, path: "/affiliates", desc: "Referral program" },
  { label: "Collaborate", icon: Handshake, path: "/collaborate", desc: "Co-creator collabs", badgeKey: "collaborate" },
  { label: "Leaderboard", icon: Trophy, path: "/leaderboard", desc: "Top creators" },
  { label: "Ad Integrations", icon: Plug, path: "/ad-integrations", desc: "Pixels & campaigns" },
  { label: "Jobs & Talent", icon: Briefcase, path: "/jobs", desc: "Freelance marketplace" },
  { label: "Messages", icon: MessageSquare, path: "/job-messages", desc: "Job conversations", badgeKey: "job-messages" },
  { label: "Notifications", icon: BellIcon, path: "/notifications", desc: "Alerts & updates", badgeKey: "notifications" },
  { label: "My Rep", icon: UserCheck, path: "/my-rep", desc: "Growth partner", requiresTier: 3 },
  { label: "Settings", icon: Settings, path: "/settings", desc: "Preferences" },
] as { label: string; icon: React.ElementType; path: string; desc: string; requiresTier?: number; badgeKey?: string }[];

const tierIcons = [Shield, TrendingUp, Zap, Crown];
const tierColors = [
  "bg-muted text-muted-foreground",
  "bg-primary/10 text-primary",
  "bg-primary/15 text-primary",
  "bg-warning/10 text-warning",
];

function TierBadge({ tier, tierName, size = "md" }: { tier: number; tierName: string; size?: "sm" | "md" }) {
  const Icon = tierIcons[tier - 1] || Shield;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${tierColors[tier - 1]} ${
      size === "sm" ? "px-2 py-0.5 text-[10px] gap-1" : "px-2.5 py-1 text-xs gap-1.5"
    }`}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {tierName}
    </span>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useApp();
  const { user, signOut } = useAuth();
  const { data: unreadCount = 0 } = useUnreadMessageCount();
  const { data: jobUnreadCount = 0 } = useUnreadJobMessageCount();
  const { unreadCount: notifUnreadCount } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const getBadge = (item: typeof navItems[0]) => {
    if (item.badgeKey === "collaborate") return unreadCount;
    if (item.badgeKey === "job-messages") return jobUnreadCount;
    if (item.badgeKey === "notifications") return notifUnreadCount;
    return 0;
  };

  const isRepLocked = profile.tier <= 2;

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card/20 backdrop-blur-xl fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-60"
      }`}>
        {/* Logo + Collapse */}
        <div className={`flex items-center justify-between p-4 ${collapsed ? "px-3" : "px-5"}`}>
          <span
            className="text-lg font-bold tracking-tight cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate("/")}
          >
            {collapsed ? "P" : "PLATFORM"}
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${collapsed ? "mx-auto" : ""}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-0.5 mt-2 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isLocked = item.requiresTier && profile.tier < item.requiresTier;

            const button = (
              <button
                key={item.label}
                onClick={() => !isLocked && navigate(item.path)}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
                } ${
                  isLocked
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-[18px] h-[18px]" />
                  {isLocked && !collapsed && (
                    <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-warning" />
                  )}
                  {!isLocked && getBadge(item) > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {getBadge(item)}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {isLocked && <Lock className="w-3 h-3 text-warning" />}
                    {item.label === "My Rep" && !isLocked && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                    {!isLocked && getBadge(item) > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {getBadge(item)}
                      </span>
                    )}
                  </>
                )}
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground text-[10px]">{item.desc}</span>
                    {isLocked && <span className="text-warning text-[10px] mt-0.5">🔒 Unlock at Tier 3</span>}
                  </TooltipContent>
                </Tooltip>
              );
            }

            if (isLocked) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">Reach 500 members or $5k MRR to unlock</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Bottom Section */}
        <div className={`border-t border-border ${collapsed ? "p-2" : "p-3"}`}>
          {/* Tier Badge */}
          {!collapsed ? (
            <div className="px-3 py-3 rounded-xl bg-secondary/30 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <TierBadge tier={profile.tier} tierName={profile.tierName} size="sm" />
              </div>
              {profile.tier < 3 && (
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Reach Scaling tier to unlock your dedicated growth rep
                </p>
              )}
              {profile.tier >= 3 && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary">
                  <Sparkles className="w-3 h-3" />
                  <span>All features unlocked</span>
                </div>
              )}
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2 mb-2">
                  <TierBadge tier={profile.tier} tierName="" size="sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>{profile.tierName} · Tier {profile.tier}</span>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Profile */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`w-full flex items-center gap-3 rounded-lg hover:bg-secondary/60 transition-colors ${
              collapsed ? "p-2 justify-center" : "px-3 py-2"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {profile.name.charAt(0)}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground">Manage account</p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? "md:ml-[68px]" : "md:ml-60"}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 md:px-8 h-14">
            <span className="md:hidden text-lg font-bold">PLATFORM</span>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-medium">{profile.name}</span>
              <TierBadge tier={profile.tier} tierName={profile.tierName} size="sm" />
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="hidden md:block w-px h-6 bg-border" />
              <div ref={profileRef} className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {profile.name.charAt(0)}
                  </div>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 min-w-[200px] rounded-xl bg-card border border-border shadow-xl py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-border mb-1">
                        <p className="text-sm font-medium">{profile.name}</p>
                        <div className="mt-1">
                          <TierBadge tier={profile.tier} tierName={profile.tierName} size="sm" />
                        </div>
                      </div>
                      <button
                        onClick={() => { navigate("/dashboard"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" /> Dashboard
                      </button>
                      <button
                        onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={async () => { await signOut(); navigate("/"); setProfileOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-secondary transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-xl z-30 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5 px-1">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            const isLocked = item.requiresTier && profile.tier < item.requiresTier;
            return (
              <button
                key={item.label}
                onClick={() => !isLocked && navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative ${
                  isLocked
                    ? "text-muted-foreground/25"
                    : isActive
                    ? "text-primary"
                    : "text-muted-foreground active:scale-90"
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-all ${isActive ? "scale-110" : ""}`} />
                  {isLocked && <Lock className="w-2 h-2 text-warning absolute -top-0.5 -right-1" />}
                  {item.label === "My Rep" && !isLocked && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-all ${isActive ? "text-primary" : ""}`}>
                  {item.label}
                </span>
                {/* Active dot indicator */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-active"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
