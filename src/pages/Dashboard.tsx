import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useApp, tierNames } from "@/context/AppContext";
import {
  TrendingUp, Users, DollarSign, Brain, Radio, Sparkles,
  BarChart3, ChevronRight, Film, Play, Loader2, Clock,
  LayoutGrid, Package, Search, ArrowRight, Zap, GraduationCap,
  Plus, Eye, CreditCard, MessageCircle, Crown, Upload, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { WeeklyGrowthReport } from "@/components/dashboard/WeeklyGrowthReport";
import { PayoutsTab } from "@/components/dashboard/PayoutsTab";
import DashboardModeToggle, { type DashboardMode } from "@/components/dashboard/DashboardModeToggle";
import AriaChat from "@/components/dashboard/AriaChat";
import DiscoverMarketplace from "@/components/dashboard/DiscoverMarketplace";
import VideoUploadSheet from "@/components/videos/VideoUploadSheet";
import { RevenueGoalTracker } from "@/components/dashboard/RevenueGoalTracker";
import ReferralRewardsCard from "@/components/affiliates/ReferralRewardsCard";
import ScheduleFirstShowCard from "@/components/scheduled/ScheduleFirstShowCard";
import { useInviteCodes } from "@/hooks/useInviteCodes";
import FirstDollarWizard from "@/components/dashboard/FirstDollarWizard";
import DiscoveryInsights from "@/components/dashboard/DiscoveryInsights";
import MusicDiscoveryBanner from "@/components/dashboard/MusicDiscoveryBanner";
import GrowthPlanCard from "@/components/dashboard/GrowthPlanCard";
import AICoachWidget from "@/components/dashboard/AICoachWidget";
import { useMilestoneTracker } from "@/hooks/useMilestoneTracker";
import MilestoneProgressPill from "@/components/onboarding/MilestoneProgressPill";

function PlatformUpgradeBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: planData } = useQuery({
    queryKey: ["platform-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke("check-platform-subscription");
        return data;
      } catch { return { plan: "free" }; }
    },
  });

  if (planData?.plan && planData.plan !== "free") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 md:mx-8 mb-4 p-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Upgrade to keep more earnings</p>
          <p className="text-xs text-muted-foreground">Reduce fees from 5% to 0% with Pro or Scale</p>
        </div>
      </div>
      <Button size="sm" onClick={() => navigate("/pricing")} className="gap-1.5 flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5" /> Upgrade
      </Button>
    </motion.div>
  );
}

export default function Dashboard() {
  const { profile } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashMode, setDashMode] = useState<DashboardMode>("discover");
  const [activeStream, setActiveStream] = useState<any>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: dashStats, isLoading: statsLoading } = useDashboardStats();
  const { data: inviteData } = useInviteCodes();
  const remainingInvites = inviteData?.remaining ?? 0;
  const [showWizard, setShowWizard] = useState(false);
  const [wizardDone, setWizardDone] = useState(() => localStorage.getItem("uply_fdw") === "1");
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  useMilestoneTracker();

  useEffect(() => {
    if (!user || wizardDone) return;
    supabase.from("profiles").select("username, total_revenue").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setCreatorUsername((data as any).username);
          if (Number((data as any).total_revenue || 0) === 0) setShowWizard(true);
        }
      });
  }, [user, wizardDone]);

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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-20 md:pb-8">
        <MusicDiscoveryBanner />
        <MilestoneProgressPill />

        {/* First Dollar Wizard */}
        {showWizard && !wizardDone && (
          <div data-tour="first-dollar-wizard" className="px-4 md:px-8 pt-4">
            <FirstDollarWizard
              onDismiss={() => { setShowWizard(false); setWizardDone(true); localStorage.setItem("uply_fdw", "1"); }}
              username={creatorUsername}
            />
          </div>
        )}

        {/* Auto-synced growth plan — export to calendar / email / share */}
        <div className="pt-4">
          <GrowthPlanCard />
        </div>
        <AICoachWidget />
        {/* Welcome + Mode Toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 pt-4 md:pt-8 pb-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, {profile.name} 👋</h1>
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 flex-shrink-0">
              <Upload className="w-4 h-4" /> Upload Video
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {dashMode === "ai" ? "Chat with ARIA — your AI growth partner" : "Explore communities, courses & creators"}
            </p>
            <DashboardModeToggle mode={dashMode} onChange={setDashMode} />
          </div>
        </motion.div>

        {/* Beta invite banner */}
        {inviteData && remainingInvites > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 mb-4">
            <button
              onClick={() => navigate("/invite-codes")}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center relative flex-shrink-0">
                <Gift className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {remainingInvites} beta invite{remainingInvites !== 1 ? "s" : ""} waiting to be used
                </p>
                <p className="text-xs text-muted-foreground">
                  Each invite bypasses the waitlist — share with creators you want to build with
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          </motion.div>
        )}

        {inviteData && inviteData.used === 5 && remainingInvites === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 mb-4">
            <button
              onClick={() => navigate("/invite-codes")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card/60 cursor-pointer hover:bg-card transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">All 5 invites used 🎉</p>
                <p className="text-xs text-muted-foreground">You've helped build UPLY's founding class</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-8 mb-4"
        >
          {statsLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card/60 p-3.5 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))
          ) : (
            [
              { label: "Members", value: dashStats?.totalMembers ?? 0, icon: Users, prefix: "" },
              { label: "Subscribers", value: dashStats?.activeSubscribers ?? 0, icon: CreditCard, prefix: "" },
              { label: "Revenue", value: dashStats?.totalRevenue ?? 0, icon: DollarSign, prefix: "$" },
              { label: "This Month", value: dashStats?.revenueThisMonth ?? 0, icon: TrendingUp, prefix: "$" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-border bg-card/60 p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                      {stat.prefix}{typeof stat.value === "number" ? stat.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : stat.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>

        <div className="px-4 md:px-8 mb-4">
          <DiscoveryInsights />
        </div>

        {/* Revenue Goal */}
        <div className="px-4 md:px-8 mb-4">
          <RevenueGoalTracker />
        </div>

        <PlatformUpgradeBanner />

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 px-4 md:px-8 mb-4 overflow-x-auto pb-1"
        >
          {[
            { label: "Go Live", icon: Radio, path: "/go-live", color: "text-destructive" },
            { label: "New Post", icon: MessageCircle, path: "/create/post/editor", color: "text-primary" },
            { label: "Upload Video", action: () => setUploadOpen(true), icon: Upload, color: "text-primary" },
            { label: "Share Link", icon: Eye, path: `/creator/${(profile as any)?.username || "me"}`, color: "text-primary" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.action || (() => navigate(action.path!))}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-card/60 hover:bg-primary/10 hover:border-primary/40 transition-all text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                <Icon className={`w-3.5 h-3.5 ${action.color}`} />
                <span className="text-foreground">{action.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Live Stream Banner */}
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

        {/* Onboarding Checklist */}
        <div className="px-4 md:px-8">
          <OnboardingChecklist />
        </div>

        {/* Referral Rewards */}
        <div className="px-4 md:px-8 mb-4">
          <ReferralRewardsCard />
        </div>

        {/* Schedule First Show Prompt */}
        <div className="px-4 md:px-8 mb-4">
          <ScheduleFirstShowCard />
        </div>

        {/* Discover Mode */}
        {dashMode === "discover" ? (
          <motion.div
            key="discover"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 md:px-8 pb-20 md:pb-8"
          >
            <DiscoverMarketplace />
          </motion.div>
        ) : (
          <motion.div
            key="ai-chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="px-2 md:px-4"
          >
            <div className="flex justify-end mb-2">
              <Link
                to="/aria-command"
                className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-600/15 border border-white/10 text-white/80 hover:text-white"
              >
                ⚡ Command Mode
              </Link>
            </div>
            <AriaChat />
          </motion.div>
        )}
      </div>
      <VideoUploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </AppLayout>
  );
}
