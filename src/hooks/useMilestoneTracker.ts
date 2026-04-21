import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useGrowthPlan } from "@/hooks/useGrowthPlan";
import { toast } from "sonner";

/**
 * Watches profile KPIs vs. the growth plan targets and auto-creates a named
 * milestone snapshot the first time each threshold is crossed.
 *
 * Milestones tracked:
 *   - members: 25%, 50%, 100% of target
 *   - mrr:     50%, 100% of target
 *   - tier:    every tier-up (>= target tier triggers "Target Tier" once)
 */
export function useMilestoneTracker() {
  const { user } = useAuth();
  const { profile } = useApp();
  const { plan } = useGrowthPlan();
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !plan?.id) return;

    const target = plan.targetKpis ?? { members: 0, mrr: 0, tier: 1 };
    const storageKey = `uply_milestones_${plan.id}`;
    const seen: Record<string, boolean> = JSON.parse(localStorage.getItem(storageKey) || "{}");

    const candidates: { key: string; reached: boolean; label: string; emoji: string }[] = [];

    // Member milestones
    if (target.members > 0) {
      const pct = profile.members / target.members;
      candidates.push({ key: "members_25", reached: pct >= 0.25, label: "25% of member goal", emoji: "🌱" });
      candidates.push({ key: "members_50", reached: pct >= 0.5, label: "Halfway to member goal", emoji: "🚀" });
      candidates.push({ key: "members_100", reached: pct >= 1, label: "Member goal reached", emoji: "🏆" });
    }

    // MRR milestones
    if (target.mrr > 0) {
      const pct = profile.mrr / target.mrr;
      candidates.push({ key: "mrr_50", reached: pct >= 0.5, label: "Halfway to MRR goal", emoji: "💸" });
      candidates.push({ key: "mrr_100", reached: pct >= 1, label: "MRR goal reached", emoji: "💎" });
    }

    // Tier milestone
    if (target.tier && profile.tier >= target.tier) {
      candidates.push({ key: `tier_${target.tier}`, reached: true, label: `Reached target tier (${profile.tierName})`, emoji: "👑" });
    }

    const toFire = candidates.filter((c) => c.reached && !seen[c.key] && !inFlight.current.has(c.key));
    if (toFire.length === 0) return;

    (async () => {
      for (const c of toFire) {
        inFlight.current.add(c.key);
        try {
          const versionName = `${c.emoji} ${c.label}`;

          // Safety: don't double-insert if the name already exists for this plan
          const { data: existing } = await supabase
            .from("growth_plan_versions")
            .select("id")
            .eq("plan_id", plan.id!)
            .eq("version_name", versionName)
            .limit(1)
            .maybeSingle();

          if (!existing) {
            const snapshot = {
              id: plan.id,
              title: plan.title,
              durationDays: plan.durationDays,
              targetKpis: plan.targetKpis,
              weeklyTasks: plan.weeklyTasks,
              milestones: plan.milestones,
              nextActions: plan.nextActions,
              kpisAtMilestone: {
                members: profile.members,
                mrr: profile.mrr,
                tier: profile.tier,
                achievedAt: new Date().toISOString(),
              },
            };

            const { error } = await supabase.from("growth_plan_versions").insert({
              plan_id: plan.id!,
              creator_id: user.id,
              version_name: versionName,
              is_named_milestone: true,
              snapshot: snapshot as any,
            });

            if (!error) {
              toast.success(`${c.emoji} Milestone unlocked`, { description: c.label });
            }
          }

          seen[c.key] = true;
          localStorage.setItem(storageKey, JSON.stringify(seen));
        } catch (e) {
          console.error("milestone snapshot error", c.key, e);
        } finally {
          inFlight.current.delete(c.key);
        }
      }
    })();
  }, [user, plan?.id, plan?.targetKpis?.members, plan?.targetKpis?.mrr, plan?.targetKpis?.tier,
      profile.members, profile.mrr, profile.tier]);
}
