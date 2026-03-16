import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApp, tierNames } from "@/context/AppContext";
import {
  TrendingUp, Users, DollarSign, Brain, Radio, Sparkles,
  BarChart3, ChevronRight, Film, Play, Loader2, Clock,
  LayoutGrid, Package, Search, ArrowRight, Zap, GraduationCap,
  Plus, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { AriaPanel } from "@/components/aria/AriaPanel";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { WeeklyGrowthReport } from "@/components/dashboard/WeeklyGrowthReport";

export default function Dashboard() {
  const { profile } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ariaOpen, setAriaOpen] = useState(false);
  const [activeStream, setActiveStream] = useState<any>(null);
  const { data: dashStats, isLoading: statsLoading } = useDashboardStats();

  useEffect(() => {
    if (!user) return;
    const fetchActiveStream = async () => {
      const { data } = await supabase
        .from("mux_live_streams")
        .select("id, title, mux_playback_id, viewer_count, started_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      setActiveStream(data);
    };
    fetchActiveStream();
    const liveChannel = supabase
      .channel("dashboard-live-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "mux_live_streams", filter: `user_id=eq.${user.id}` }, () => fetchActiveStream())
      .subscribe();
    return () => { supabase.removeChannel(liveChannel); };
  }, [user]);

  const quickActions = [
    {
      label: "Community",
      desc: "Manage your space, posts & members",
      icon: LayoutGrid,
      color: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
      action: () => navigate(user ? `/community/${user.id}` : "/auth"),
    },
    {
      label: "Go Live",
      desc: "Start a livestream or watch others",
      icon: Radio,
      color: "from-red-500/20 to-red-600/5",
      iconColor: "text-red-400",
      action: () => navigate("/go-live"),
    },
    {
      label: "Courses",
      desc: "Create lessons & modules for your audience",
      icon: GraduationCap,
      color: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-400",
      action: () => navigate(user ? `/community/${user.id}?tab=classroom` : "/auth"),
    },
    {
      label: "Products",
      desc: "Sell digital products & services",
      icon: Package,
      color: "from-amber-500/20 to-amber-600/5",
      iconColor: "text-amber-400",
      action: () => navigate("/products"),
    },
    {
      label: "Discover",
      desc: "Find creators & explore the platform",
      icon: Search,
      color: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-400",
      action: () => navigate("/discover"),
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-20 md:pb-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 pt-4 md:pt-8 pb-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, {profile.name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your command center.</p>
        </motion.div>

        {/* Live Now Banner */}
        {activeStream && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 md:mx-8 mb-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-destructive text-destructive-foreground">
                <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                LIVE
              </span>
              <div>
                <p className="text-sm font-semibold">{activeStream.title || "Your Live Stream"}</p>
                <p className="text-xs text-muted-foreground">{activeStream.viewer_count || 0} viewers</p>
              </div>
            </div>
            <Button variant="soft" size="sm" onClick={() => navigate(`/stream/${activeStream.id}`)} className="gap-1.5">
              <Radio className="w-3.5 h-3.5" /> View Stream
            </Button>
          </motion.div>
        )}

        {/* ARIA Weekly Growth Report */}
        <div className="px-4 md:px-8 mb-5">
          <WeeklyGrowthReport />
        </div>

        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Stats Row */}
        <div className="section-glow bg-surface-alt rounded-none px-4 md:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
          {[
            { label: "Members", value: dashStats?.totalMembers ?? 0, icon: Users, iconColor: "text-violet-400" },
            { label: "Revenue", value: `$${(dashStats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-400" },
            { label: "This Month", value: `$${(dashStats?.revenueThisMonth ?? 0).toLocaleString()}`, icon: TrendingUp, iconColor: "text-blue-400" },
            { label: "Streams", value: dashStats?.totalLiveStreams ?? 0, icon: Radio, iconColor: "text-red-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              className="glass-card p-4 group hover:border-primary/20 transition-colors"
            >
              {statsLoading ? (
                <div>
                  <div className="h-3 w-14 bg-secondary rounded animate-pulse mb-2" />
                  <div className="h-7 w-16 bg-secondary rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                </>
              )}
            </motion.div>
          ))}
          </motion.div>
        </div>

        {/* Quick Actions - Core Features */}
        <div className="px-4 md:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Your Tools</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                  whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                  onClick={action.action}
                  className="glass-card p-4 sm:p-5 text-left group relative overflow-hidden hover:border-primary/20 transition-all"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <action.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${action.iconColor}`} />
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                    <h3 className="font-bold text-foreground text-sm sm:text-base mb-0.5">{action.label}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">{action.desc}</p>
                  </div>
                </motion.button>
              ))}

              {/* ARIA Card */}
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + quickActions.length * 0.06 }}
                whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                onClick={() => setAriaOpen(true)}
                className="glass-card p-4 sm:p-5 text-left group relative overflow-hidden hover:border-primary/20 transition-all border-dashed"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">AI</span>
                  </div>
                  <h3 className="font-bold text-foreground text-sm sm:text-base mb-0.5">Ask ARIA</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">Your AI growth partner — get personalized advice</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Getting Started / Health */}
        <div className="section-glow bg-surface-alt rounded-none px-4 md:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
          {/* Tier Progress */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Your Level</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
                Tier {profile.tier} · {profile.tierName}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">{profile.members}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((profile.members / (profile.tier < 4 ? [100, 500, 2000, 10000][profile.tier - 1] : 10000)) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.5 }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">MRR</span>
                  <span className="font-medium">${profile.mrr.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((profile.mrr / (profile.tier < 4 ? [1000, 5000, 20000, 100000][profile.tier - 1] : 100000)) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.6 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Health Score */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Business Health</h3>
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="27" fill="none" strokeWidth="4" className="stroke-secondary" />
                  <circle cx="32" cy="32" r="27" fill="none" strokeWidth="4"
                    className={profile.healthScore < 40 ? "stroke-destructive" : profile.healthScore < 70 ? "stroke-warning" : "stroke-primary"}
                    strokeLinecap="round"
                    strokeDasharray={`${(profile.healthScore / 100) * 169.6} 169.6`}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${
                  profile.healthScore < 40 ? "text-destructive" : profile.healthScore < 70 ? "text-warning" : "text-primary"
                }`}>{profile.healthScore}</span>
              </div>
              <div className="flex-1">
                {profile.healthScore === 0 ? (
                  <p className="text-sm text-muted-foreground">Complete your setup and add products to build your health score.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Calculated from members, revenue, and engagement metrics.</p>
                )}
              </div>
            </div>
          </div>
          </motion.div>
        </div>
      </div>
      {user && <AriaPanel open={ariaOpen} onClose={() => setAriaOpen(false)} />}
    </AppLayout>
  );
}
