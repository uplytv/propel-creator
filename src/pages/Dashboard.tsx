import { useState } from "react";
import { motion } from "framer-motion";
import { useApp, tierNames } from "@/context/AppContext";
import { TrendingUp, Users, DollarSign, Brain, MessageSquare, Phone, Clock, CheckCircle2, Zap, ChevronRight, BarChart3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { AIGrowthEngine } from "@/components/AIGrowthEngine";

const tierTargets = [
  { members: 100, mrr: 1000 },
  { members: 500, mrr: 5000 },
  { members: 2000, mrr: 20000 },
  { members: 10000, mrr: 100000 },
];

const actionPlan = [
  { task: "Create a free lead magnet to attract new members", time: 25, impact: "High" as const },
  { task: "Post a community introduction thread", time: 10, impact: "Medium" as const },
  { task: "Set up your first automated email sequence", time: 30, impact: "High" as const },
];

const healthActions = [
  { label: "Add a lead magnet", impact: "High" as const },
  { label: "Improve onboarding flow", impact: "Medium" as const },
  { label: "Update pricing page", impact: "Low" as const },
];

const impactColors = {
  High: "bg-primary/10 text-primary border-primary/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard() {
  const { profile } = useApp();
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [revenueRange, setRevenueRange] = useState<"30" | "60" | "90">("30");
  const [showGrowthEngine, setShowGrowthEngine] = useState(false);

  const target = tierTargets[profile.tier - 1];
  const nextTier = profile.tier < 4 ? tierNames[profile.tier] : null;
  const memberPct = Math.min((profile.members / target.members) * 100, 100);
  const mrrPct = Math.min((profile.mrr / target.mrr) * 100, 100);
  const overallPct = Math.max(memberPct, mrrPct);

  const toggleTask = (i: number) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

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
            onClick={() => setShowGrowthEngine(false)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${!showGrowthEngine ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setShowGrowthEngine(true)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${showGrowthEngine ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            <Zap className="w-3.5 h-3.5" /> AI Growth Engine
          </button>
        </div>

        {showGrowthEngine ? (
          <motion.div key="growth-engine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AIGrowthEngine />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1 - Current Level */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Current Level</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Progress to Next Tier</h3>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Your Growth Partner</h3>
              {profile.tier <= 2 ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">ARIA — Your AI Growth Partner</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">This week's top recommendation: Create a free lead magnet to grow your email list by 30%.</p>
                    <Button variant="default" size="sm"><MessageSquare className="w-4 h-4 mr-1" /> Chat with ARIA</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">JR</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">Jordan Rivera</p>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Revenue Specialist</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary mt-1"><Clock className="w-3 h-3" /> Avg. response: 2 hours</div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="default" size="sm"><Phone className="w-4 h-4 mr-1" /> Book a Call</Button>
                      <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-1" /> Message</Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Card 4 - Health Score */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Business Health Score</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className="stroke-secondary" />
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className={scoreRing} strokeLinecap="round"
                      strokeDasharray={`${(profile.healthScore / 100) * 213.6} 213.6`} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xl font-extrabold ${scoreColor}`}>{profile.healthScore}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {healthActions.map((a) => (
                    <button key={a.label} className={`text-xs px-3 py-1.5 rounded-full border ${impactColors[a.impact]} font-medium`}>
                      {a.label} · {a.impact}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 5 - Revenue Tracker */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Tracker</h3>
                <div className="flex gap-1">
                  {(["30", "60", "90"] as const).map((d) => (
                    <button key={d} onClick={() => setRevenueRange(d)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${revenueRange === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >{d}d</button>
                  ))}
                </div>
              </div>
              <div className="h-32 flex items-end gap-1">
                {Array.from({ length: 15 }).map((_, i) => {
                  const h = 20 + Math.sin(i * 0.5) * 30 + Math.random() * 30;
                  return (
                    <motion.div key={i} className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors"
                      initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.3 + i * 0.03, duration: 0.5 }} />
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">MRR</p>
                  <p className="text-lg font-bold">${profile.mrr.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-bold">${profile.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projected</p>
                  <p className="text-lg font-bold text-primary">${Math.round(profile.mrr * 1.15).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            {/* Card 6 - Action Plan */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">This Week's Action Plan</h3>
              <div className="space-y-3">
                {actionPlan.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => toggleTask(i)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left ${checkedTasks.has(i) ? "bg-primary/5" : "hover:bg-secondary"}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all flex-shrink-0 ${checkedTasks.has(i) ? "bg-primary border-primary" : "border-border"}`}>
                      {checkedTasks.has(i) && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="w-3 h-3 text-primary-foreground" /></motion.div>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${checkedTasks.has(i) ? "line-through text-muted-foreground" : ""}`}>{a.task}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {a.time}min</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${impactColors[a.impact]} font-medium`}>{a.impact} Impact</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
