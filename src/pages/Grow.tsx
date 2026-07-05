import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Target, TrendingUp, Zap, CheckCircle2, Circle, Clock, Flame, Trophy, Star, Sparkles, Handshake, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHero from "@/components/layout/PageHero";
import { useGrowProgress, useUpdateGrowProgress } from "@/hooks/useGrowProgress";

interface ProtocolTask {
  key: string;
  label: string;
  description: string;
}

interface ProtocolWeek {
  week: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tasks: ProtocolTask[];
}

const PROTOCOL_WEEKS: ProtocolWeek[] = [
  {
    week: 1, title: "Foundation & Positioning", subtitle: "Define your offer, audience, and pricing strategy", icon: Target,
    tasks: [
      { key: "w1_offer", label: "Define your core high-ticket offer", description: "Package your expertise into a clear, results-driven offer" },
      { key: "w1_avatar", label: "Map your ideal buyer avatar", description: "Demographics, pain points, desired outcomes, and buying triggers" },
      { key: "w1_pricing", label: "Set premium pricing strategy", description: "Research market rates and position at the value-based tier" },
      { key: "w1_messaging", label: "Craft your revenue-first messaging", description: "Write your one-liner, pitch, and 3 key benefit statements" },
      { key: "w1_product", label: "Create your first product listing", description: "Set up your product on the platform with compelling copy" },
    ],
  },
  {
    week: 2, title: "Traffic & Lead Generation", subtitle: "Build your acquisition engine and start capturing leads", icon: Zap,
    tasks: [
      { key: "w2_channel", label: "Choose your primary traffic channel", description: "Pick ONE channel: organic social, paid ads, SEO, or partnerships" },
      { key: "w2_lead_magnet", label: "Build a lead magnet or free resource", description: "Create something valuable that pre-qualifies your buyers" },
      { key: "w2_landing", label: "Set up your landing / sales page", description: "One clear page with offer, proof, CTA, and urgency" },
      { key: "w2_email", label: "Configure your email sequence", description: "Build a 5-email nurture sequence for new leads" },
      { key: "w2_first_leads", label: "Generate your first 25 leads", description: "Drive traffic and capture at least 25 qualified contacts" },
    ],
  },
  {
    week: 3, title: "Sales & Conversion", subtitle: "Close your first deals and optimize the sales process", icon: TrendingUp,
    tasks: [
      { key: "w3_outreach", label: "Launch direct outreach campaign", description: "Reach out to 50+ warm prospects with personalized messages" },
      { key: "w3_calls", label: "Book and run 5 discovery calls", description: "Qualify prospects and present your offer on live calls" },
      { key: "w3_first_sale", label: "Close your first sale", description: "Get your first paying customer — momentum starts here" },
      { key: "w3_testimonial", label: "Collect your first testimonial", description: "Document the result and get permission to share it" },
      { key: "w3_referral", label: "Set up a referral or affiliate system", description: "Create incentives for customers to bring you more customers" },
    ],
  },
  {
    week: 4, title: "Scale & Systematize", subtitle: "Build repeatable systems for predictable revenue", icon: Rocket,
    tasks: [
      { key: "w4_automate", label: "Automate your top-of-funnel", description: "Set up automated lead capture, scoring, and nurture flows" },
      { key: "w4_upsell", label: "Create an upsell or backend offer", description: "Design a higher-ticket offer for existing buyers" },
      { key: "w4_metrics", label: "Set up your revenue dashboard", description: "Track CAC, LTV, conversion rate, and MRR in real-time" },
      { key: "w4_community", label: "Launch your community or membership", description: "Create a space for ongoing engagement and retention" },
      { key: "w4_plan", label: "Build your 90-day scale plan", description: "Outline next steps for doubling down on what's working" },
    ],
  },
];

const ALL_TASK_KEYS = PROTOCOL_WEEKS.flatMap((w) => w.tasks.map((t) => t.key));
const TOTAL_TASKS = ALL_TASK_KEYS.length;

const MOTIVATIONAL_PROMPTS = {
  no_streak: "Every empire starts with a single step. Complete a task today to start your streak. 🚀",
  streak_1: "Day 1 in the books! Momentum is everything — come back tomorrow. 🔥",
  streak_3: "3 days strong! You're building a habit that prints revenue. 💪",
  streak_7: "7-day streak! You're operating like a machine now. 🏆",
};

function getStreakLabel(streak: number): string {
  if (streak >= 30) return "Legendary Operator";
  if (streak >= 14) return "Unstoppable";
  if (streak >= 7) return "On Fire";
  if (streak >= 3) return "Building Momentum";
  if (streak >= 1) return "Getting Started";
  return "Start Your Streak";
}

export default function Grow() {
  const navigate = useNavigate();
  const { data: progress, isLoading } = useGrowProgress();
  const updateProgress = useUpdateGrowProgress();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  // Sync from DB
  useEffect(() => {
    if (progress?.completed_tasks) {
      setCompletedTasks(new Set(progress.completed_tasks));
    }
  }, [progress]);

  const streak = progress?.streak_days ?? 0;

  const toggleTask = (taskKey: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskKey)) next.delete(taskKey);
      else next.add(taskKey);
      // Save to DB
      updateProgress.mutate(Array.from(next));
      return next;
    });
  };

  const overallProgress = Math.round((completedTasks.size / TOTAL_TASKS) * 100);

  const getWeekStatus = (week: ProtocolWeek) => {
    const done = week.tasks.filter((t) => completedTasks.has(t.key)).length;
    if (done === 0) return "not_started";
    if (done === week.tasks.length) return "completed";
    return "in_progress";
  };

  const streakDots = useMemo(() => {
    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString("en", { weekday: "short" }).charAt(0);
      const isActive = i < streak;
      dots.push({ day: dayLabel, active: isActive, isToday: i === 0 });
    }
    return dots;
  }, [streak]);

  const motivation = streak >= 7 ? MOTIVATIONAL_PROMPTS.streak_7 : streak >= 3 ? MOTIVATIONAL_PROMPTS.streak_3 : streak >= 1 ? MOTIVATIONAL_PROMPTS.streak_1 : MOTIVATIONAL_PROMPTS.no_streak;

  return (
    <AppLayout>
      <PageHero
        eyebrow="Growth"
        title="Launch"
        gradientWord="Protocol"
        subtitle="30 Days to First Scalable Revenue — a structured operator playbook."
      />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        {/* Streak & Motivation Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className={`w-5 h-5 ${streak > 0 ? "text-warning" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Daily Streak</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${streak >= 3 ? "bg-warning/10 text-warning border border-warning/20" : "bg-secondary text-muted-foreground"}`}>
                {getStreakLabel(streak)}
              </span>
            </div>
            <div className="flex items-end gap-4 mb-4">
              <div>
                <span className={`text-4xl font-bold font-mono ${streak > 0 ? "text-warning" : "text-muted-foreground"}`}>{streak}</span>
                <span className="text-sm text-muted-foreground ml-1">day{streak !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-between">
              {streakDots.map((dot, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    dot.active ? "bg-warning/15 text-warning" : dot.isToday ? "bg-secondary border-2 border-dashed border-muted-foreground/30 text-muted-foreground" : "bg-secondary text-muted-foreground/40"
                  }`}>
                    {dot.active ? <Flame className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                  </div>
                  <span className={`text-[10px] font-medium ${dot.isToday ? "text-foreground" : "text-muted-foreground"}`}>{dot.day}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Motivation</span>
              </div>
              <p className="text-sm leading-relaxed">{motivation}</p>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Overall Progress</span>
                  <span className="font-mono font-bold text-primary">{overallProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary mt-2 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} transition={{ duration: 1, delay: 0.3 }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{completedTasks.size}/{TOTAL_TASKS} tasks completed</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Weekly Protocol */}
        <div className="space-y-4">
          {PROTOCOL_WEEKS.map((week, wi) => {
            const status = getWeekStatus(week);
            const isExpanded = expandedWeek === week.week;
            const weekDone = week.tasks.filter((t) => completedTasks.has(t.key)).length;
            const WeekIcon = week.icon;

            return (
              <motion.div key={week.week} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: wi * 0.05 }} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(isExpanded ? 0 : week.week)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    status === "completed" ? "bg-primary/10 text-primary" : status === "in_progress" ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"
                  }`}>
                    <WeekIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">Week {week.week}: {week.title}</h3>
                      {status === "completed" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>
                      ) : status === "in_progress" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{week.subtitle}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{weekDone}/{week.tasks.length}</span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="border-t border-border">
                      <div className="px-5 py-4 space-y-2">
                        {week.tasks.map((task) => {
                          const isDone = completedTasks.has(task.key);
                          return (
                            <button key={task.key} onClick={() => toggleTask(task.key)}
                              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left ${isDone ? "bg-primary/5" : "hover:bg-secondary/50"}`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${isDone ? "bg-primary border-primary" : "border-border"}`}>
                                {isDone && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="w-3 h-3 text-primary-foreground" /></motion.div>}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Co-Creator CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-6 glow-border mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Handshake className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Ready to grow faster? Find a Co-Creator</h3>
              <p className="text-sm text-muted-foreground mt-1">Combine audiences with a complementary creator. Launch a joint product and split revenue automatically.</p>
            </div>
            <Button variant="hero" className="gap-2 flex-shrink-0" onClick={() => navigate("/collaborate")}>
              Explore Matches <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
