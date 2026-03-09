import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApp, tierNames } from "@/context/AppContext";
import { TrendingUp, Users, DollarSign, Brain, MessageSquare, Phone, Clock, CheckCircle2, Zap, ChevronRight, BarChart3, Target, Briefcase, Info, Film, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { AIGrowthEngine } from "@/components/AIGrowthEngine";
import { MyJobsTab } from "@/components/dashboard/MyJobsTab";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const tierTargets = [
  { members: 100, mrr: 1000 },
  { members: 500, mrr: 5000 },
  { members: 2000, mrr: 20000 },
  { members: 10000, mrr: 100000 },
];

export default function Dashboard() {
  const { profile } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "growth" | "jobs">("overview");
  const [recordings, setRecordings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("mux_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setRecordings(data);
    };
    fetch();

    const channel = supabase
      .channel("dashboard-assets")
      .on("postgres_changes", { event: "*", schema: "public", table: "mux_assets" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const target = tierTargets[profile.tier - 1];
  const nextTier = profile.tier < 4 ? tierNames[profile.tier] : null;
  const memberPct = Math.min((profile.members / target.members) * 100, 100);
  const mrrPct = Math.min((profile.mrr / target.mrr) * 100, 100);
  const overallPct = Math.max(memberPct, mrrPct);

  const scoreColor = profile.healthScore < 40 ? "text-destructive" : profile.healthScore < 70 ? "text-warning" : "text-primary";
  const scoreRing = profile.healthScore < 40 ? "stroke-destructive" : profile.healthScore < 70 ? "stroke-warning" : "stroke-primary";

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {profile.name} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's how your business is doing.</p>
        </motion.div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 ${activeTab === "overview" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("growth")}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${activeTab === "growth" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"}`}
          >
            <Zap className="w-3.5 h-3.5" /> AI Growth Engine
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${activeTab === "jobs" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"}`}
          >
            <Briefcase className="w-3.5 h-3.5" /> My Jobs
          </button>
        </div>

        {activeTab === "growth" ? (
          <motion.div key="growth-engine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AIGrowthEngine />
          </motion.div>
        ) : activeTab === "jobs" ? (
          <motion.div key="my-jobs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <MyJobsTab />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1 - Current Level */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }} className="glass-card p-6 group">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 group-hover:text-primary transition-colors duration-300">Current Level</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="4" className="stroke-secondary" />
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="4" className="stroke-primary" strokeLinecap="round"
                      strokeDasharray={`${overallPct * 2.136} 213.6`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{Math.round(overallPct)}%</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">Tier {profile.tier}</span>
                    <span className="font-bold text-lg">{profile.tierName}</span>
                  </div>
                  {nextTier && <p className="text-sm text-muted-foreground mt-1">You're {Math.round(overallPct)}% of the way to {nextTier}</p>}
                </div>
              </div>
            </motion.div>

            {/* Card 2 - Progress to Next Tier */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }} className="glass-card p-6 group">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 group-hover:text-primary transition-colors duration-300">Progress to Next Tier</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-semibold">{profile.members} / {target.members}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${memberPct}%` }} transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="font-semibold">${profile.mrr.toLocaleString()} / ${target.mrr.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${mrrPct}%` }} transition={{ duration: 1, delay: 0.4 }} />
                  </div>
                </div>
                {nextTier && (
                  <p className="text-sm text-primary font-medium">
                    Unlock <span className="font-bold">{nextTier}</span> in {target.members - profile.members} members or ${(target.mrr - profile.mrr).toLocaleString()} MRR — whichever comes first.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Card 3 - Growth Partner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }} className="glass-card p-6 group">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 group-hover:text-primary transition-colors duration-300">Your Growth Partner</h3>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">ARIA — Your AI Growth Partner</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">AI-powered growth recommendations coming soon. Connect your data to unlock personalized insights.</p>
                  <Button variant="outline" size="sm" disabled>
                    <MessageSquare className="w-4 h-4 mr-1" /> Coming Soon
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Card 4 - Health Score */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }} className="glass-card p-6 group">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 group-hover:text-primary transition-colors duration-300">Business Health Score</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className="stroke-secondary" />
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className={scoreRing} strokeLinecap="round"
                      strokeDasharray={`${(profile.healthScore / 100) * 213.6} 213.6`} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xl font-extrabold ${scoreColor}`}>{profile.healthScore}</span>
                </div>
                <div className="flex-1">
                  {profile.healthScore === 0 ? (
                    <p className="text-sm text-muted-foreground">Complete your onboarding and add products to build your health score.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Your business health is calculated from members, revenue, and engagement metrics.</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Card 5 - Revenue Tracker */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }} className="glass-card p-6 group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors duration-300">Revenue Tracker</h3>
              </div>
              {profile.mrr > 0 || profile.totalRevenue > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">MRR</p>
                    <p className="text-2xl font-bold">${profile.mrr.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${profile.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No revenue data yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Revenue will appear here once payments are connected.</p>
                </div>
              )}
            </motion.div>

            {/* Card 6 - Action Plan Placeholder */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }} className="glass-card p-6 group">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 group-hover:text-primary transition-colors duration-300">This Week's Action Plan</h3>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Info className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Connect your growth data to see your action plan.</p>
                <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations will appear here once ARIA is integrated.</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
