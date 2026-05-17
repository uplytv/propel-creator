import { ReactNode, useState, useRef, useEffect } from "react";
import UploadProgressBar from "@/components/upload/UploadProgressBar";
import { useLocation, useNavigate } from "react-router-dom";
import MobileTabBar from "./MobileTabBar";
import SocialTopNav from "@/components/social/SocialTopNav";
import VideoUploadSheet from "@/components/videos/VideoUploadSheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Package, Lock,
  LogOut, Settings, ChevronLeft, ChevronRight, Shield, TrendingUp,
  Zap, Crown, Sparkles, BarChart3, Radio, Menu, X, Wallet, LayoutGrid, ChevronDown,
  GraduationCap, DollarSign, Bot, Briefcase, Handshake, Share2, Film,
  Trophy, Plug, MessageSquare, Bell as BellIcon, UserCheck, Search, Rocket,
  Video, CreditCard, UserPlus, User, Globe, Mail, Mic, Gift, Rss, Tv, Code, Music, Calendar
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useApp, tierNames } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useFeatures } from "@/context/FeatureContext";
import { useUnreadMessageCount } from "@/hooks/useCollaborations";
import { useUnreadJobMessageCount } from "@/hooks/useJobMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { useWallet } from "@/hooks/useWallet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInviteCodes } from "@/hooks/useInviteCodes";
import { getProfileHandleCandidates } from "@/lib/profileSlug";
import { safeNavPath, validateNavPaths, isKnownRoute } from "@/lib/routeRegistry";

type NavItem = { label: string; icon: React.ElementType; path: string; desc: string; requiresTier?: number; badgeKey?: string; featureKey?: string };

// Sections in display order. MUSIC is open by default; all others collapsed.
const coreNav: { core: string; label: string; icon: React.ElementType; items: NavItem[] }[] = [
  {
    core: "live",
    label: "CONTENT",
    icon: Film,
    items: [
      { label: "Content Library", icon: Film, path: "/content-library", desc: "Videos & uploads", featureKey: "content_library" },
      { label: "Podcast", icon: Mic, path: "/podcast", desc: "Host your podcast", featureKey: "podcast" },
      { label: "Podcast RSS", icon: Rss, path: "/podcast-rss", desc: "Submit to Apple Podcasts & Spotify", featureKey: "content" },
      { label: "Events", icon: Calendar, path: "/events", desc: "Schedule virtual or IRL events" },
      { label: "Go Live", icon: Radio, path: "/go-live", desc: "Start a live stream" },
    ],
  },
  {
    core: "music",
    label: "MUSIC",
    icon: Music,
    items: [
      { label: "Music Home", icon: Music, path: "/music", desc: "Stream what creators drop" },
      { label: "Feed", icon: Tv, path: "/music/feed", desc: "Activity from artists you follow" },
      { label: "Search", icon: Search, path: "/music/search", desc: "Find tracks, albums, artists" },
      { label: "Library", icon: Package, path: "/music/library", desc: "Your saved music" },
      { label: "Charts", icon: TrendingUp, path: "/music/charts", desc: "What's trending now" },
      { label: "Upload", icon: Video, path: "/music/upload", desc: "Drop a track or album" },
      { label: "Release Tracker", icon: Globe, path: "/music/distribution", desc: "Log DSP submissions across Spotify, Apple Music & more" },
      { label: "DSP Connections", icon: Plug, path: "/music/connections", desc: "Connect Spotify & Apple" },
      // archived: Music Labs (music-labs)
    ],
  },
  {
    core: "grow",
    label: "GROW",
    icon: TrendingUp,
    items: [
      { label: "SmartLinks", icon: Share2, path: "/smart-links", desc: "Music smart links & pre-saves" },
      { label: "Radiate", icon: Radio, path: "/radiate", desc: "Broadcast to nearby fans" },
      { label: "Ad Campaigns", icon: Plug, path: "/ad-integrations", desc: "Boost streams", featureKey: "stream_boost" },
      { label: "Affiliates", icon: Handshake, path: "/affiliates", desc: "Referral program", featureKey: "affiliates" },
      { label: "Content Syndication", icon: Globe, path: "/distribution", desc: "Publish everywhere at once" },
      { label: "Brand Deals", icon: Briefcase, path: "/marketplace", desc: "Sponsored opportunities" },
    ],
  },
  {
    core: "space",
    label: "COMMUNITY",
    icon: LayoutGrid,
    items: [
      { label: "My Community", icon: LayoutGrid, path: "__space__", desc: "Your community hub" },
      { label: "Network Feed", icon: Tv, path: "/network", desc: "Live · Trending · Shop" },
      { label: "Leaderboard", icon: Trophy, path: "/leaderboard", desc: "Top members", featureKey: "leaderboard" },
    ],
  },
  {
    core: "audience",
    label: "AUDIENCE",
    icon: Mail,
    items: [
      { label: "Newsletter", icon: Mail, path: "/newsletter", desc: "Email your members", featureKey: "newsletter" },
      { label: "Subscribers", icon: UserPlus, path: "/dashboard/subscribers", desc: "Email capture & leads" },
      { label: "Broadcast", icon: Radio, path: "/dashboard/broadcast", desc: "Email your list" },
      { label: "Drip Sequences", icon: Zap, path: "/dashboard/drip-sequences", desc: "Automated emails" },
      { label: "Email Analytics", icon: BarChart3, path: "/dashboard/email-analytics", desc: "Open & click rates" },
    ],
  },
  {
    core: "earn",
    label: "EARN",
    icon: DollarSign,
    items: [
      { label: "Products", icon: Package, path: "/products", desc: "What you sell", featureKey: "product_store" },
      { label: "Wallet", icon: Wallet, path: "/wallet", desc: "Earnings & payouts", featureKey: "wallet" },
      { label: "Buy Credits", icon: CreditCard, path: "/buy-credits", desc: "Purchase credits" },
      { label: "Jobs & Talent", icon: Briefcase, path: "/jobs", desc: "Freelance marketplace", featureKey: "jobs_marketplace" },
      { label: "Collaborate", icon: Handshake, path: "/collaborate", desc: "Co-creator collabs", badgeKey: "collaborate", featureKey: "collaborations" },
    ],
  },
  {
    core: "aria",
    label: "ARIA",
    icon: Bot,
    items: [
      { label: "AI Team", icon: Bot, path: "/dashboard/ai-team", desc: "Your 5 AI agents" },
      { label: "Growth Agent", icon: Sparkles, path: "/grow", desc: "Growth tasks", featureKey: "growth_tasks" },
      { label: "Launchpad", icon: Rocket, path: "/launchpad", desc: "Launch something new" },
    ],
  },
];

const utilityNav: NavItem[] = [
  { label: "Settings", icon: Settings, path: "/settings", desc: "Preferences" },
  { label: "Developer API", icon: Code, path: "/developer", desc: "API keys & webhooks" },
  { label: "Messages", icon: MessageSquare, path: "/job-messages", desc: "Conversations", badgeKey: "job-messages" },
  { label: "Notifications", icon: BellIcon, path: "/notifications", desc: "Alerts", badgeKey: "notifications" },
  { label: "My Rep", icon: UserCheck, path: "/my-rep", desc: "Growth partner", requiresTier: 3 },
];

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
  const { isEnabled, isCoreEnabled } = useFeatures();
  const { data: unreadCount = 0 } = useUnreadMessageCount();
  const { data: jobUnreadCount = 0 } = useUnreadJobMessageCount();
  const { unreadCount: notifUnreadCount } = useNotifications();
  const { data: wallet } = useWallet();
  const { data: inviteData } = useInviteCodes();
  const remainingInvites = inviteData?.remaining ?? 0;
  const isApprovedUser = profile.isApproved;
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCores, setExpandedCores] = useState<string[]>(["music"]);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Check admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin-nav", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role" as any, { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  // Vanity slug for the user's public artist page
  const { data: vanitySlug } = useQuery({
    queryKey: ["nav-vanity-slug", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("artist_profiles" as any)
        .select("vanity_slug")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as any)?.vanity_slug as string | null;
    },
    enabled: !!user,
  });

  // Resolve a public handle for the current user. We only build a /@ URL when
  // we actually have a slug-like handle (vanity slug or claimed username) — a
  // raw user.id won't resolve on SocialCreatorPage and produced a 404 dead-end
  // when clicked from the nav bar's Profile shortcut. Fall back to /dashboard
  // (or /auth when signed out) so the link always lands somewhere real.
  const handleCandidate =
    vanitySlug ||
    profile.username ||
    getProfileHandleCandidates(profile.name)[0] ||
    null;
  const publicProfilePath = user
    ? handleCandidate
      ? `/@${handleCandidate}`
      : "/dashboard"
    : "/auth";
  const yourPagePath = user ? `/music/artist/${user.id}/edit` : "/auth";

  const getBadge = (item: NavItem) => {
    if (item.badgeKey === "collaborate") return unreadCount;
    if (item.badgeKey === "job-messages") return jobUnreadCount;
    if (item.badgeKey === "notifications") return notifUnreadCount;
    return 0;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Auto-expand the core that contains the active route
  useEffect(() => {
    for (const group of coreNav) {
      const hasActive = group.items.some(item => {
        const resolved = resolvePath(item);
        return location.pathname === resolved || location.pathname.startsWith(resolved + "/");
      });
      if (hasActive && !expandedCores.includes(group.core)) {
        setExpandedCores(prev => [...prev, group.core]);
      }
    }
    // Auto-expand More Tools if a utility item is active
    const utilityActive = utilityNav.some(item => {
      const resolved = resolvePath(item);
      return location.pathname === resolved;
    }) || location.pathname.startsWith("/admin");
    if (utilityActive && !expandedCores.includes("more_tools")) {
      setExpandedCores(prev => [...prev, "more_tools"]);
    }
  }, [location.pathname, user]);

  const resolvePath = (item: NavItem) => {
    if (item.path === "__space__") return user ? `/community/${user.id}` : "/auth";
    if (item.path === "__public_profile__") return user ? `/creator/${profile.name || user.id}` : "/auth";
    return item.path;
  };

  const renderNavItem = (item: NavItem, inCollapsed: boolean, onNavigate?: () => void) => {
    // Check feature visibility
    if (item.featureKey && !isEnabled(item.featureKey)) return null;

    const resolvedPath = resolvePath(item);
    const isActive = location.pathname === resolvedPath;
    const isLocked = !!(item.requiresTier && profile.tier < item.requiresTier);
    const badge = getBadge(item);

    const tourKey =
      resolvedPath === "/products" ? "nav-products"
      : resolvedPath === "/grow" ? "nav-grow"
      : resolvedPath === "/discover" ? "nav-discover"
      : resolvedPath === "/dashboard" ? "nav-dashboard"
      : undefined;

    return (
      <button
        key={item.label}
        data-tour={tourKey}
        onClick={() => {
          if (!isLocked) {
            navigate(resolvedPath);
            onNavigate?.();
          }
        }}
        className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
          inCollapsed ? "px-0 py-2 justify-center" : "px-3 py-2"
        } ${
          isLocked ? "text-muted-foreground/30 cursor-not-allowed"
            : isActive ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        <div className="relative flex-shrink-0">
          <item.icon className="w-[18px] h-[18px]" />
          {isLocked && !inCollapsed && <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-warning" />}
        </div>
        {!inCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {isLocked && <Lock className="w-3 h-3 text-warning" />}
            {!isLocked && badge > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {badge}
              </span>
            )}
          </>
        )}
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </button>
    );
  };

  const renderDesktopNav = () => (
    <nav className={`flex-1 mt-2 ${collapsed ? "px-2" : "px-3"} overflow-y-auto`}>
      {/* Discover + Home */}
      {renderNavItem({ label: "Discover", icon: Search, path: "/discover", desc: "Find creators" }, collapsed)}
      {renderNavItem({ label: "Home", icon: Home, path: "/dashboard", desc: "Overview" }, collapsed)}
      {renderNavItem({ label: "Your Page", icon: Globe, path: yourPagePath, desc: "Your public artist page" }, collapsed)}

      {/* 5 Cores */}
      {coreNav.map(group => {
        if (!isCoreEnabled(group.core)) return null;
        const isExpanded = expandedCores.includes(group.core);
        const visibleItems = group.items.filter(i => !i.featureKey || isEnabled(i.featureKey));
        if (visibleItems.length === 0) return null;

        if (collapsed) {
          return visibleItems.map(item => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>{renderNavItem(item, true)}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ));
        }

        return (
          <div key={group.core} className="mt-2">
            <button
              onClick={() => setExpandedCores(prev =>
                prev.includes(group.core) ? prev.filter(c => c !== group.core) : [...prev, group.core]
              )}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <group.icon className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-0.5 ml-1"
                >
                  {visibleItems.map(item => renderNavItem(item, false))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* More Tools */}
      {(() => {
        const moreToolsCore = "more_tools";
        const isExpanded = expandedCores.includes(moreToolsCore);
        const allUtilityItems = [
          ...utilityNav,
          ...(isAdmin ? [{ label: "Admin", icon: Shield, path: "/admin", desc: "Platform admin" } as NavItem] : []),
        ];

        if (collapsed) {
          return (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-0.5">
              {allUtilityItems.map(item => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{renderNavItem(item, true)}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          );
        }

        return (
          <div className="mt-3 pt-3 border-t border-border/50">
            <button
              onClick={() => setExpandedCores(prev =>
                prev.includes(moreToolsCore) ? prev.filter(c => c !== moreToolsCore) : [...prev, moreToolsCore]
              )}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">MORE TOOLS</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-0.5 ml-1"
                >
                  {allUtilityItems.map(item => renderNavItem(item, false))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to content
      </a>
      {/* Desktop Sidebar */}
      <aside aria-label="Main navigation" className={`hidden md:flex flex-col border-r border-border bg-card/20 backdrop-blur-xl fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-60"
      }`}>
        {/* Logo + Collapse */}
        <div className={`flex items-center justify-between p-4 ${collapsed ? "px-3" : "px-5"}`}>
          <div className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="UPLY" className={collapsed ? "h-[66px]" : "h-[88px]"} />
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${collapsed ? "mx-auto" : ""}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {renderDesktopNav()}

        {/* Bottom Section */}
        <div className={`border-t border-border ${collapsed ? "p-2" : "p-3"}`}>
          {/* Wallet Widget */}
          {isEnabled("wallet") && (
            !collapsed ? (
              <button
                onClick={() => navigate("/wallet")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent-green/5 border border-accent-green/20 hover:bg-accent-green/10 transition-colors mb-3"
              >
                <Wallet className="w-4 h-4 text-accent-green" />
                <div className="flex-1 text-left">
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                  <p className="text-sm font-bold text-accent-green">${Number(wallet?.available_balance ?? 0).toFixed(2)}</p>
                </div>
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => navigate("/wallet")} className="w-full flex justify-center py-2 mb-2 rounded-lg hover:bg-accent-green/10 transition-colors">
                    <Wallet className="w-4 h-4 text-accent-green" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Balance: ${Number(wallet?.available_balance ?? 0).toFixed(2)}</TooltipContent>
              </Tooltip>
            )
          )}

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
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2 mb-2">
                  <TierBadge tier={profile.tier} tierName="" size="sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{profile.tierName} · Tier {profile.tier}</TooltipContent>
            </Tooltip>
          )}

          {/* Profile — clickable shortcut to your public artist page */}
          <button
            onClick={() => navigate(publicProfilePath)}
            className={`w-full flex items-center gap-3 rounded-lg hover:bg-white/5 transition-colors ${collapsed ? "p-2 justify-center" : "px-3 py-2"}`}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {profile.name.charAt(0)}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {vanitySlug ? `uply.tv/@${vanitySlug}` : "Claim your @ →"}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? "md:ml-[68px]" : "md:ml-60"}`}>
        {/* Top Bar */}
        <header role="banner" className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl safe-area-top">
          <div className="flex items-center justify-between px-4 md:px-8 h-14">
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Open menu" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                <Menu className="w-5 h-5" />
              </button>
              <img src="/logo.png" alt="UPLY" className="h-[75px] w-auto object-contain cursor-pointer" onClick={() => navigate("/")} />
            </div>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-medium">{profile.name}</span>
              <TierBadge tier={profile.tier} tierName={profile.tierName} size="sm" />
            </div>
            <div className="flex items-center gap-3">
              {isApprovedUser && remainingInvites > 0 && (
                <button
                  onClick={() => navigate("/invite-codes")}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
                  aria-label={`${remainingInvites} beta invite${remainingInvites !== 1 ? "s" : ""} remaining`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {remainingInvites} Invite{remainingInvites !== 1 ? "s" : ""}
                  </span>
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                </button>
              )}
              <NotificationBell />
              <div className="hidden md:block w-px h-6 bg-border" />
              <div ref={profileRef} className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                  aria-label="Account menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {profile.name.charAt(0)}
                    </div>
                  )}
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
                      <button
                         onClick={() => { navigate(publicProfilePath); setProfileOpen(false); }}
                        className="w-full text-left px-4 py-2 border-b border-border mb-1 hover:bg-secondary transition-colors"
                      >
                        <p className="text-sm font-medium">{profile.name}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <TierBadge tier={profile.tier} tierName={profile.tierName} size="sm" />
                          <span className="text-[10px] text-primary font-semibold">View profile →</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { navigate("/dashboard"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" /> Dashboard
                      </button>
                      {isApprovedUser && (
                        <button
                          onClick={() => { navigate("/invite-codes"); setProfileOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Gift className="w-4 h-4" /> Beta Invites
                          {remainingInvites > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                              {remainingInvites}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                      <button
                        onClick={() => { navigate("/settings/connections"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Plug className="w-4 h-4" /> Ad Connections
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { navigate("/admin"); setProfileOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Shield className="w-4 h-4" /> Admin Panel
                        </button>
                      )}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={async () => { await signOut(); navigate("/"); setProfileOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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

        {/* Social Top Nav — show on social/discover routes for authenticated users */}
        {user && (location.pathname.startsWith("/social") || location.pathname === "/discover") && (
          <SocialTopNav />
        )}

        <UploadProgressBar />
        <main id="main-content" role="main" aria-label="Page content" className="pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0" tabIndex={-1}>{children}</main>
      </div>

      {/* Mobile Tab Bar */}
      <MobileTabBar onUploadVideo={() => setUploadSheetOpen(true)} />

      {/* Video Upload Sheet */}
      <VideoUploadSheet open={uploadSheetOpen} onClose={() => setUploadSheetOpen(false)} />

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <img src="/logo.png" alt="UPLY" className="h-[75px] w-auto object-contain cursor-pointer" onClick={() => { navigate("/"); setMobileMenuOpen(false); }} />
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { navigate(publicProfilePath); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 flex-1 min-w-0 rounded-lg px-1 py-1 -mx-1 hover:bg-white/5 transition-colors text-left"
                  >
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {profile.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{profile.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {vanitySlug ? `uply.tv/@${vanitySlug}` : "Claim your @ →"}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => { navigate("/settings"); setMobileMenuOpen(false); }}
                    aria-label="Plan settings"
                    className="flex-shrink-0"
                  >
                    <TierBadge tier={profile.tier} tierName={profile.tierName} size="sm" />
                  </button>
                </div>
              </div>

              {isApprovedUser && (
                <div className="px-4 py-2">
                  <button
                    onClick={() => { navigate("/invite-codes"); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-foreground">Beta Invites</p>
                      <p className="text-[11px] text-muted-foreground">
                        {remainingInvites > 0
                          ? `${remainingInvites} remaining — share with creators`
                          : "All invites used 🎉"}
                      </p>
                    </div>
                    {remainingInvites > 0 && (
                      <span className="min-w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {remainingInvites}
                      </span>
                    )}
                  </button>
                </div>
              )}

              <nav aria-label="Mobile navigation" className="flex-1 py-2 px-3 overflow-y-auto">
                {renderNavItem({ label: "Discover", icon: Search, path: "/discover", desc: "Find creators" }, false, () => setMobileMenuOpen(false))}
                {renderNavItem({ label: "Home", icon: Home, path: "/dashboard", desc: "Overview" }, false, () => setMobileMenuOpen(false))}
                {renderNavItem({ label: "Your Page", icon: Globe, path: yourPagePath, desc: "Your public artist page" }, false, () => setMobileMenuOpen(false))}

                {coreNav.map(group => {
                  if (!isCoreEnabled(group.core)) return null;
                  const visibleItems = group.items.filter(i => !i.featureKey || isEnabled(i.featureKey));
                  if (visibleItems.length === 0) return null;
                  const isExpanded = expandedCores.includes(group.core);

                  return (
                    <div key={group.core} className="mt-2">
                      <button
                        onClick={() => setExpandedCores(prev =>
                          prev.includes(group.core) ? prev.filter(c => c !== group.core) : [...prev, group.core]
                        )}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                      >
                        <group.icon className="w-3.5 h-3.5" />
                        <span className="flex-1 text-left">{group.label}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="space-y-0.5 ml-1">
                          {visibleItems.map(item => renderNavItem(item, false, () => setMobileMenuOpen(false)))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {(() => {
                  const moreToolsCore = "more_tools";
                  const isExpanded = expandedCores.includes(moreToolsCore);
                  const allUtilityItems = [
                    ...utilityNav,
                    ...(isAdmin ? [{ label: "Admin", icon: Shield, path: "/admin", desc: "Platform admin" } as NavItem] : []),
                  ];
                  return (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={() => setExpandedCores(prev =>
                          prev.includes(moreToolsCore) ? prev.filter(c => c !== moreToolsCore) : [...prev, moreToolsCore]
                        )}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="flex-1 text-left">MORE TOOLS</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="space-y-0.5 ml-1">
                          {allUtilityItems.map(item => renderNavItem(item, false, () => setMobileMenuOpen(false)))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </nav>

              <div className="border-t border-border p-3">
                <button
                  onClick={async () => { await signOut(); navigate("/"); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <LogOut className="w-[18px] h-[18px]" /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
