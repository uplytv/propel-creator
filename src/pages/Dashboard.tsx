import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useApp, tierNames } from "@/context/AppContext";
import {
  TrendingUp, Users, DollarSign, Brain, Radio, Sparkles,
  BarChart3, ChevronRight, Film, Play, Loader2, Clock,
  LayoutGrid, Package, Search, ArrowRight, Zap, GraduationCap,
  Plus, Eye, CreditCard, MessageCircle, Crown, Upload
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
import VideoUploadModal from "@/components/videos/VideoUploadModal";

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
        {/* Welcome + Mode Toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 pt-4 md:pt-8 pb-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, {profile.name} 👋</h1>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {dashMode === "ai" ? "Chat with ARIA — your AI growth partner" : "Explore communities, courses & creators"}
            </p>
            <DashboardModeToggle mode={dashMode} onChange={setDashMode} />
          </div>
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
            <AriaChat />
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
