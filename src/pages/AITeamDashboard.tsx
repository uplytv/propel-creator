import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, TrendingUp, Users, DollarSign, Settings as GearIcon,
  Check, X, ChevronRight, Loader2, Zap, Bot, Eye, AlertTriangle,
  Lightbulb, Trophy, Target, BarChart3, Clock, Sparkles, Rocket
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useAriaAgents, useAriaPendingTasks, useAriaAgentTasks,
  useAriaInsights, useAriaUsage, useAriaDailyReport,
  useApproveTask, useRejectTask, useToggleAgent, useTriggerAgent,
  useDismissInsight, useAriaRealtimeTasks,
  type AriaAgent, type AriaAgentTask, type AriaInsight,
} from "@/hooks/useAriaTeam";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const AGENT_META: Record<string, { emoji: string; label: string; color: string; nextAction: string }> = {
  content: { emoji: "📸", label: "Content AI", color: "text-blue-400", nextAction: "Generate content calendar for this week" },
  growth: { emoji: "📈", label: "Growth AI", color: "text-primary", nextAction: "Build landing page when you create your first product" },
  community: { emoji: "👥", label: "Community AI", color: "text-purple-400", nextAction: "Monitor community questions — checks every 30 min" },
  sales: { emoji: "💰", label: "Sales AI", color: "text-yellow-400", nextAction: "Watch for buying signals during your next live stream" },
  operations: { emoji: "⚙️", label: "Operations AI", color: "text-orange-400", nextAction: "Weekly business report — Monday 7am" },
};

const PLACEHOLDER_AGENTS: AriaAgent[] = [
  "content", "growth", "community", "sales", "operations"
].map((t) => ({
  id: `placeholder-${t}`,
  creator_id: "",
  agent_type: t,
  status: "inactive",
  tasks_completed: 0,
  tasks_approved: 0,
  tasks_rejected: 0,
  confidence_score: 0.65,
  last_active_at: null,
  config: null,
  memory: null,
  performance_data: null,
  created_at: new Date().toISOString(),
}));

const INSIGHT_ICONS: Record<string, typeof Lightbulb> = {
  suggestion: Lightbulb,
  warning: AlertTriangle,
  win: Trophy,
  trend: BarChart3,
  opportunity: Target,
};

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const label = pct >= 85 ? "Working independently" : pct >= 65 ? "Building trust" : "Earning autonomy";
  const color = pct >= 85 ? "bg-primary" : pct >= 65 ? "bg-yellow-500" : "bg-muted-foreground";
  return (
    <div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{label} · {pct}%</p>
    </div>
  );
}

/* PROBLEM 5 — Agent cards show specific next action */
function AgentCard({ agent, onToggle }: { agent: AriaAgent; onToggle: (id: string, status: string) => void }) {
  const meta = AGENT_META[agent.agent_type] || { emoji: "🤖", label: agent.agent_type, color: "text-foreground", nextAction: "Initializing..." };
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3 min-w-[180px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
              <span className="text-[10px] text-muted-foreground capitalize">{agent.status}</span>
            </div>
          </div>
        </div>
        <Switch
          checked={agent.status === "active"}
          onCheckedChange={(checked) => onToggle(agent.id, checked ? "active" : "paused")}
        />
      </div>
      <ConfidenceBar score={agent.confidence_score || 0.65} />
      {/* Next action line instead of generic stats */}
      <p className="text-[10px] text-muted-foreground leading-snug">
        <span className="text-foreground font-medium">Next:</span> {meta.nextAction}
      </p>
    </div>
  );
}

function PendingTaskCard({ task, onApprove, onReject }: {
  task: AriaAgentTask;
  onApprove: (id: string) => void;
  onReject: (id: string, feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [showReject, setShowReject] = useState(false);
  const meta = AGENT_META[task.agent_type] || { emoji: "🤖", label: task.agent_type, color: "text-foreground", nextAction: "" };
  const confPct = Math.round((task.confidence || 0.5) * 100);

  const renderOutput = (data: any) => {
    if (!data) return null;
    if (typeof data === "string") return <p className="text-sm text-muted-foreground">{data}</p>;
    if (data.calendar) {
      return (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {data.calendar.slice(0, 4).map((d: any, i: number) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-primary font-mono w-8">{d.date_label?.slice(0, 3)}</span>
              <span className="text-foreground">{d.title}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{d.platform}</Badge>
            </div>
          ))}
          {data.calendar?.length > 4 && <p className="text-xs text-muted-foreground">+{data.calendar.length - 4} more...</p>}
        </div>
      );
    }
    if (data.suggestions) {
      return (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {data.suggestions.slice(0, 3).map((s: any, i: number) => (
            <div key={i} className="text-xs">
              <span className="text-foreground font-medium">{s.title || s.new_title}</span>
              <span className="text-muted-foreground ml-1">— {s.description?.slice(0, 80)}</span>
            </div>
          ))}
        </div>
      );
    }
    if (data.funnel_name) {
      return (
        <div className="space-y-1 text-xs">
          <p className="text-foreground font-medium">{data.headline}</p>
          <p className="text-muted-foreground">{data.subheadline}</p>
        </div>
      );
    }
    return <p className="text-xs text-muted-foreground">{JSON.stringify(data).slice(0, 200)}</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/60 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span>{meta.emoji}</span>
        <Badge variant="outline" className="text-[10px]">{task.task_type}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">ARIA is {confPct}% confident</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{task.task_title}</h3>
      {renderOutput(task.output_data)}

      {showReject ? (
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Why are you rejecting this? (helps ARIA learn)"
            className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-xs resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => { onReject(task.id, feedback); setShowReject(false); }}>
              Confirm Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => onApprove(task.id)}>
            <Check className="w-3 h-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
            <X className="w-3 h-3 mr-1" /> Reject
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function InsightCard({ insight, onDismiss }: { insight: AriaInsight; onDismiss: (id: string) => void }) {
  const Icon = INSIGHT_ICONS[insight.insight_type] || Lightbulb;
  const meta = AGENT_META[insight.agent_type] || { emoji: "🤖", label: "ARIA", color: "text-foreground", nextAction: "" };
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{insight.body}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground">{meta.emoji} {meta.label} · {Math.round((insight.confidence || 0.5) * 100)}% confident</span>
          </div>
        </div>
        <button onClick={() => onDismiss(insight.id)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
      {insight.action_label && insight.action_url && (
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.location.href = insight.action_url!}>
          {insight.action_label} <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      )}
      {insight.action_label && !insight.action_url && (
        <Button size="sm" variant="outline" className="text-xs h-7">
          {insight.action_label} <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

function OnboardingModal({ onComplete, isGenerating }: { onComplete: () => void; isGenerating: boolean }) {
  const agents = [
    { emoji: "📸", label: "Content AI", desc: "Creates clips, captions, and calendars" },
    { emoji: "📈", label: "Growth AI", desc: "Builds funnels and optimizes conversions" },
    { emoji: "👥", label: "Community AI", desc: "Engages members and detects churn" },
    { emoji: "💰", label: "Sales AI", desc: "Detects buying signals and recovers carts" },
    { emoji: "⚙️", label: "Operations AI", desc: "Reports, payouts, and health checks" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground font-heading">Meet your AI Team</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Five autonomous agents that run your creator business 24/7
          </p>
        </div>
        <div className="space-y-3">
          {agents.map((a, i) => (
            <motion.div
              key={a.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3"
            >
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        {isGenerating ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ARIA is preparing your first content calendar...
          </div>
        ) : (
          <Button className="w-full" size="lg" onClick={onComplete}>
            <Sparkles className="w-4 h-4 mr-2" /> View Your AI Team
          </Button>
        )}
      </motion.div>
    </div>
  );
}

/* PROBLEM 3 — Onboarding value preview when 0 tasks */
function OnboardingValuePreview({ creatorType }: { creatorType?: string }) {
  const type = (creatorType || "general").toLowerCase();

  const getExamples = () => {
    const base = [
      { agent: "📸 Content AI", action: "Generate your first content clips automatically when you go live" },
      { agent: "📈 Growth AI", action: "Build a landing page for your next product the moment you create it" },
      { agent: "👥 Community AI", action: "Answer member questions within 2 hours so you never miss engagement" },
    ];
    // Customize based on creator type
    if (type === "fitness") {
      base[0].action = "Create workout highlight clips from your live training sessions";
      base[1].action = "Build a landing page for your next fitness program automatically";
    } else if (type === "gaming") {
      base[0].action = "Clip your best gaming moments and create highlight reels automatically";
      base[1].action = "Optimize your stream titles and thumbnails for maximum discoverability";
    } else if (type === "finance") {
      base[0].action = "Turn your market analysis streams into shareable short-form content";
      base[1].action = "Build a funnel for your next financial course or guide";
    } else if (type === "music") {
      base[0].action = "Create performance clips and behind-the-scenes content from your sessions";
      base[1].action = "Build a pre-save page for your upcoming releases";
    } else if (type === "education") {
      base[0].action = "Turn your lesson recordings into study guides and recap clips";
      base[1].action = "Create a landing page for your next course module automatically";
    }
    return base;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Your AI Team is warming up</h3>
          <p className="text-xs text-muted-foreground">Here's what they'll do for you this week</p>
        </div>
      </div>
      <div className="space-y-3">
        {getExamples().map((ex, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-card/60 border border-border/50 p-3">
            <span className="text-lg">{ex.agent.split(" ")[0]}</span>
            <div>
              <p className="text-xs font-semibold text-foreground">{ex.agent.split(" ").slice(1).join(" ")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ex.action}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AITeamDashboard() {
  const { user } = useAuth();
  const { data: agents, isLoading: agentsLoading } = useAriaAgents();
  const { data: pendingTasks } = useAriaPendingTasks();
  const { data: allTasks } = useAriaAgentTasks();
  const { data: insights } = useAriaInsights();
  const { data: usage } = useAriaUsage();
  const { data: report } = useAriaDailyReport();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const toggleAgent = useToggleAgent();
  const triggerAgent = useTriggerAgent();
  const dismissInsight = useDismissInsight();
  useAriaRealtimeTasks();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creatorType, setCreatorType] = useState<string | undefined>();

  // Fetch creator type for personalized onboarding
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("creator_type").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.creator_type) setCreatorType(data.creator_type); });
  }, [user]);

  // Check onboarding
  useEffect(() => {
    if (!user || agentsLoading) return;
    const key = `aria_team_onboarded_${user.id}`;
    if (localStorage.getItem(key)) return;
    if (!allTasks || allTasks.length === 0) {
      setShowOnboarding(true);
      setIsGenerating(true);
      triggerAgent.mutateAsync({ agentType: "content", taskType: "content_calendar" })
        .then(() => setIsGenerating(false))
        .catch(() => setIsGenerating(false));
    }
  }, [user, agentsLoading, allTasks]);

  const handleOnboardingComplete = () => {
    if (user) localStorage.setItem(`aria_team_onboarded_${user.id}`, "true");
    setShowOnboarding(false);
  };

  const handleApprove = (taskId: string) => {
    approveTask.mutate({ taskId }, {
      onSuccess: () => toast.success("Task approved — ARIA is learning your preferences"),
    });
  };

  const handleReject = (taskId: string, feedback: string) => {
    rejectTask.mutate({ taskId, feedback }, {
      onSuccess: () => toast.success("Task rejected — ARIA won't repeat this mistake"),
    });
  };

  /* PROBLEM 4 — Bulk approve ALL pending tasks (not just low-risk) */
  const handleBulkApproveAll = () => {
    const calendarTasks = pendingTasks?.filter(t => t.task_type === "content_calendar") || [];
    if (calendarTasks.length === 0) return;
    Promise.all(calendarTasks.map(t => approveTask.mutateAsync({ taskId: t.id })))
      .then(() => {
        toast.success(`🚀 Approved ${calendarTasks.length} tasks — your AI team is now running!`);
      })
      .catch((e) => {
        console.error("[AITeamDashboard] bulk approve failed", e);
        toast.error("Some tasks couldn't be approved. Please try again.");
      });
  };

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const completedTasks = allTasks?.filter(t => t.status === "completed" || t.status === "approved") || [];
  const todayTasks = completedTasks.filter(t => t.created_at?.startsWith(today));
  const weekTasks = completedTasks.filter(t => {
    const d = new Date(t.created_at);
    return d > new Date(Date.now() - 7 * 86400000);
  });
  const hoursSaved = (weekTasks.length * 0.5).toFixed(1);
  const hasCompletedTasks = completedTasks.length > 0;

  if (agentsLoading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24 space-y-6">
        {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} isGenerating={isGenerating} />}

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground font-heading">Your AI Team</h1>
          {/* PROBLEM 3: Show value preview OR real stats */}
          {hasCompletedTasks ? (
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{todayTasks.length}</span>
                <span className="text-xs text-muted-foreground">tasks today</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{hoursSaved}h</span>
                <span className="text-xs text-muted-foreground">saved this week</span>
              </div>
              {report?.revenue_generated > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">${report.revenue_generated}</span>
                  <span className="text-xs text-muted-foreground">influenced</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <OnboardingValuePreview creatorType={creatorType} />
            </div>
          )}
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(agents && agents.length > 0 ? agents : PLACEHOLDER_AGENTS).map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggle={(id, status) => toggleAgent.mutate({ agentId: id, status })}
            />
          ))}
        </div>

        {/* PROBLEM 4 — Pending Approvals with bulk approve CTA */}
        {(pendingTasks?.length || 0) > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                Pending Approvals
                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{pendingTasks?.length}</Badge>
              </h2>
            </div>

            {/* Bulk approve button */}
            {(pendingTasks?.filter(t => t.task_type === "content_calendar").length || 0) > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">These are low-risk suggestions — approve all to let your AI team get started</p>
                <Button
                  size="lg"
                  className="w-full bg-primary text-primary-foreground font-bold text-base py-6"
                  onClick={handleBulkApproveAll}
                  disabled={approveTask.isPending}
                >
                  {approveTask.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Rocket className="w-5 h-5 mr-2" />
                  )}
                  Start My AI Team — Approve All
                </Button>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {pendingTasks?.slice(0, 6).map(task => (
                <PendingTaskCard key={task.id} task={task} onApprove={handleApprove} onReject={handleReject} />
              ))}
            </div>
          </div>
        )}

        {/* Live Task Feed */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live Task Feed
          </h2>
          {allTasks?.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-border bg-card/40">
              <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Your AI team will start working automatically</p>
              <Button
                size="sm"
                disabled={triggerAgent.isPending}
                onClick={() => {
                  toast.loading("ARIA is generating your content calendar...", { id: "gen-calendar" });
                  triggerAgent.mutate(
                    { agentType: "content", taskType: "content_calendar" },
                    {
                      onSuccess: () => toast.success("Content calendar generated! Check Pending Approvals.", { id: "gen-calendar" }),
                      onError: (err) => toast.error(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`, { id: "gen-calendar" }),
                    }
                  );
                }}
              >
                {triggerAgent.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {triggerAgent.isPending ? "Generating..." : "Generate Content Calendar"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {allTasks?.slice(0, 20).map(task => {
                  const meta = AGENT_META[task.agent_type] || { emoji: "🤖", label: "ARIA", color: "text-foreground", nextAction: "" };
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-card/30 border border-border/50 hover:bg-card/50 transition-colors"
                    >
                      <span className="text-lg">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{task.task_title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {task.created_at ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true }) : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        task.status === "completed" || task.status === "approved" ? "border-primary/40 text-primary" :
                        task.status === "pending" ? "border-yellow-500/40 text-yellow-400" :
                        task.status === "rejected" ? "border-destructive/40 text-destructive" :
                        "border-border text-muted-foreground"
                      }`}>
                        {task.status}
                      </Badge>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Insights */}
        {(insights?.length || 0) > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Insights Inbox</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {insights?.map(insight => (
                <InsightCard key={insight.id} insight={insight} onDismiss={(id) => dismissInsight.mutate(id)} />
              ))}
            </div>
          </div>
        )}

        {/* Daily Report */}
        {report?.narrative && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Latest Report</h2>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{report.narrative}</p>
              <div className="flex flex-wrap gap-3 mt-4">
                {report.total_tasks_completed > 0 && (
                  <span className="text-xs text-muted-foreground">{report.total_tasks_completed} tasks</span>
                )}
                {report.hours_saved > 0 && (
                  <span className="text-xs text-muted-foreground">{report.hours_saved}h saved</span>
                )}
                {report.members_gained > 0 && (
                  <span className="text-xs text-muted-foreground">+{report.members_gained} members</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Usage Meter */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">AI Usage This Month</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">API Tasks Used</span>
              <span className="text-foreground font-medium">{usage?.api_calls || 0} / {usage?.budget_limit || 500}</span>
            </div>
            <Progress
              value={Math.min(((usage?.api_calls || 0) / (usage?.budget_limit || 500)) * 100, 100)}
              className="h-2"
            />
            {(usage?.api_calls || 0) / (usage?.budget_limit || 500) >= 0.8 && (
              <p className="text-xs text-yellow-400">⚠️ You're approaching your monthly limit</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
