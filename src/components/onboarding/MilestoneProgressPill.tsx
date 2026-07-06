import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useGrowthPlan } from "@/hooks/useGrowthPlan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Milestone {
  key: string;
  label: string;
  emoji: string;
  reached: boolean;
  group: "onboarding" | "kpi";
}

interface Props {
  /** Optional: pass current onboarding step (0..totalSteps). Omit on non-onboarding pages. */
  onboardingStep?: number;
  totalOnboardingSteps?: number;
}

const fireConfetti = () => {
  const defaults = { startVelocity: 35, spread: 360, ticks: 60, zIndex: 9999 };
  const colors = ["#3D7CFF", "#ffffff", "#FFD700"];
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.85, y: 0.85 }, colors });
  setTimeout(() => confetti({ ...defaults, particleCount: 50, origin: { x: 0.5, y: 0.6 }, colors }), 150);
};

export function MilestoneProgressPill({ onboardingStep, totalOnboardingSteps = 3 }: Props) {
  const { user } = useAuth();
  const { profile } = useApp();
  const { plan } = useGrowthPlan();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [serverLoaded, setServerLoaded] = useState(false);

  // Load previously-unlocked milestones from Supabase (cross-device sync)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_milestones")
        .select("milestone_key")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (!error && data) {
        data.forEach((row: any) => seenRef.current.add(row.milestone_key));
      }
      setServerLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const milestones = useMemo<Milestone[]>(() => {
    const list: Milestone[] = [];

    // Onboarding step milestones
    if (typeof onboardingStep === "number" && totalOnboardingSteps > 0) {
      for (let i = 1; i <= totalOnboardingSteps; i++) {
        list.push({
          key: `onb_${i}`,
          label: `Step ${i} of ${totalOnboardingSteps}`,
          emoji: i === totalOnboardingSteps ? "🎯" : "✨",
          reached: onboardingStep >= i,
          group: "onboarding",
        });
      }
    }

    // KPI milestones (mirror useMilestoneTracker logic)
    const target = plan?.targetKpis;
    if (target?.members && target.members > 0) {
      const pct = profile.members / target.members;
      list.push({ key: "members_25", label: "25% of member goal", emoji: "🌱", reached: pct >= 0.25, group: "kpi" });
      list.push({ key: "members_50", label: "Halfway to members", emoji: "🚀", reached: pct >= 0.5, group: "kpi" });
      list.push({ key: "members_100", label: "Member goal hit", emoji: "🏆", reached: pct >= 1, group: "kpi" });
    }
    if (target?.mrr && target.mrr > 0) {
      const pct = profile.mrr / target.mrr;
      list.push({ key: "mrr_50", label: "Halfway to MRR goal", emoji: "💸", reached: pct >= 0.5, group: "kpi" });
      list.push({ key: "mrr_100", label: "MRR goal hit", emoji: "💎", reached: pct >= 1, group: "kpi" });
    }
    if (target?.tier && profile.tier >= target.tier) {
      list.push({ key: `tier_${target.tier}`, label: `Reached ${profile.tierName}`, emoji: "👑", reached: true, group: "kpi" });
    }

    return list;
  }, [onboardingStep, totalOnboardingSteps, profile.members, profile.mrr, profile.tier, profile.tierName, plan?.targetKpis]);

  const reachedCount = milestones.filter((m) => m.reached).length;
  const total = milestones.length;

  // Detect newly reached milestones → celebrate + persist to Supabase
  useEffect(() => {
    if (!user || !serverLoaded) return;
    if (!initializedRef.current) {
      // Seed locally-already-reached ones (covers session+server) so we don't re-celebrate history
      milestones.filter((m) => m.reached).forEach((m) => seenRef.current.add(m.key));
      initializedRef.current = true;
      return;
    }
    const newlyReached = milestones.filter((m) => m.reached && !seenRef.current.has(m.key));
    if (newlyReached.length === 0) return;

    newlyReached.forEach((m) => seenRef.current.add(m.key));

    // Persist (idempotent via unique constraint)
    (async () => {
      const rows = newlyReached.map((m) => ({
        user_id: user.id,
        milestone_key: m.key,
        label: m.label,
        emoji: m.emoji,
        group_type: m.group,
      }));
      const { error } = await supabase.from("user_milestones").insert(rows);
      if (error && !/duplicate|unique/i.test(error.message)) {
        console.error("milestone sync error", error);
      }
    })();

    newlyReached.forEach((m) => {
      toast.success(`${m.emoji} ${m.label}`, { description: "Milestone unlocked" });
    });
    fireConfetti();
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1600);
    return () => clearTimeout(t);
  }, [milestones, serverLoaded, user?.id]);

  if (!user || total === 0) return null;

  const pct = total > 0 ? Math.round((reachedCount / total) * 100) : 0;

  return (
    <>
      {/* Floating pill */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "fixed bottom-24 right-4 md:bottom-6 z-50 flex items-center gap-2 rounded-full border border-border bg-background/90 backdrop-blur px-3 py-2 shadow-lg min-h-[44px]",
          pulse && "ring-2 ring-primary animate-pulse"
        )}
        aria-label={`Milestone progress: ${reachedCount} of ${total}`}
      >
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">
          {reachedCount}/{total}
        </span>
        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.button>

      {/* Detail sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", damping: 24 }}
              className="fixed inset-x-4 bottom-24 md:bottom-6 md:right-6 md:left-auto md:w-[360px] z-[61] rounded-2xl border border-border bg-background p-5 shadow-2xl max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Your milestones</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-full hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{reachedCount} of {total} unlocked</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {(["onboarding", "kpi"] as const).map((group) => {
                const items = milestones.filter((m) => m.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-4 last:mb-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      {group === "onboarding" ? "Onboarding" : "Growth Plan"}
                    </p>
                    <ul className="space-y-2">
                      {items.map((m) => (
                        <li
                          key={m.key}
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-2.5 border",
                            m.reached
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-muted opacity-70"
                          )}
                        >
                          <span className="text-lg">{m.emoji}</span>
                          <span className="flex-1 text-sm">{m.label}</span>
                          {m.reached ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-border" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              <a
                href="/achievements"
                className="mt-2 flex items-center justify-center gap-2 w-full text-xs font-medium text-primary hover:underline min-h-[44px]"
              >
                View full achievement history →
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default MilestoneProgressPill;
