import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { buildGrowthPlan, type GrowthPlan, type PlanTask } from "@/lib/growthPlan";
import { toast } from "sonner";

export interface EditablePlan {
  id?: string;
  title: string;
  durationDays: number;
  targetKpis: { members: number; mrr: number; tier: number };
  weeklyTasks: PlanTask[];
  milestones: PlanTask[];
  nextActions: { title: string; reason: string }[];
}

export interface PlanVersion {
  id: string;
  version_name: string | null;
  is_named_milestone: boolean;
  snapshot: EditablePlan;
  created_at: string;
}

function planFromBuilt(p: GrowthPlan): EditablePlan {
  return {
    title: `${p.creatorName}'s ${p.weeklyTasks.length ? "30-Day" : ""} Growth Plan`.trim(),
    durationDays: 30,
    targetKpis: { members: p.kpis.members, mrr: p.kpis.mrr, tier: p.kpis.tier },
    weeklyTasks: p.weeklyTasks,
    milestones: p.milestones,
    nextActions: p.nextActions,
  };
}

export function useGrowthPlan() {
  const { user } = useAuth();
  const { profile } = useApp();
  const [plan, setPlan] = useState<EditablePlan | null>(null);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load or seed plan
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("growth_plans")
        .select("*")
        .eq("creator_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) console.error("load growth plan", error);

      if (data) {
        setPlan({
          id: data.id,
          title: data.title,
          durationDays: data.duration_days,
          targetKpis: (data.target_kpis as any) ?? { members: 0, mrr: 0, tier: 1 },
          weeklyTasks: (data.weekly_tasks as any) ?? [],
          milestones: (data.milestones as any) ?? [],
          nextActions: (data.next_actions as any) ?? [],
        });
      } else {
        // Seed from buildGrowthPlan
        const seeded = planFromBuilt(buildGrowthPlan(profile));
        setPlan(seeded);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, profile]);

  const loadVersions = useCallback(async (planId: string) => {
    const { data, error } = await supabase
      .from("growth_plan_versions")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { console.error(error); return; }
    setVersions((data ?? []).map((v: any) => ({
      id: v.id,
      version_name: v.version_name,
      is_named_milestone: v.is_named_milestone,
      snapshot: v.snapshot,
      created_at: v.created_at,
    })));
  }, []);

  useEffect(() => {
    if (plan?.id) loadVersions(plan.id);
  }, [plan?.id, loadVersions]);

  const save = useCallback(async (next: EditablePlan, opts?: { snapshot?: boolean; versionName?: string }) => {
    if (!user) { toast.error("Sign in to save your plan"); return null; }
    setSaving(true);
    try {
      const payload = {
        creator_id: user.id,
        title: next.title,
        duration_days: next.durationDays,
        target_kpis: next.targetKpis as any,
        weekly_tasks: next.weeklyTasks as any,
        milestones: next.milestones as any,
        next_actions: next.nextActions as any,
      };

      let savedId = next.id;
      if (next.id) {
        const { error } = await supabase.from("growth_plans").update(payload).eq("id", next.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("growth_plans")
          .upsert(payload, { onConflict: "creator_id" })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      const updated = { ...next, id: savedId };
      setPlan(updated);

      if (opts?.snapshot !== false) {
        const { error: vErr } = await supabase.from("growth_plan_versions").insert({
          plan_id: savedId!,
          creator_id: user.id,
          version_name: opts?.versionName ?? null,
          is_named_milestone: !!opts?.versionName,
          snapshot: updated as any,
        });
        if (vErr) console.error("snapshot error", vErr);
        else if (savedId) loadVersions(savedId);
      }

      return updated;
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Couldn't save your plan");
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, loadVersions]);

  const restoreVersion = useCallback(async (v: PlanVersion) => {
    if (!plan) return;
    const restored: EditablePlan = { ...v.snapshot, id: plan.id };
    await save(restored, { snapshot: true, versionName: `Restored from ${new Date(v.created_at).toLocaleString()}` });
    toast.success("Version restored");
  }, [plan, save]);

  const fetchSuggestions = useCallback(async (
    field: "task" | "milestone" | "next_action" | "title",
    current?: string,
    siblings?: string[]
  ) => {
    const { data, error } = await supabase.functions.invoke("growth-plan-suggest", {
      body: {
        field,
        current,
        context: {
          creatorName: profile.name,
          members: profile.members,
          mrr: profile.mrr,
          tier: profile.tier,
          challenge: profile.challenge,
          title: plan?.title,
          siblings,
        },
      },
    });
    if (error) {
      const msg = error.message?.includes("429") ? "Slow down — try again in a few seconds."
        : error.message?.includes("402") ? "AI credits exhausted. Add credits in workspace settings."
        : "Couldn't get suggestions";
      toast.error(msg);
      throw error;
    }
    return (data?.suggestions ?? []) as { text: string; reason: string }[];
  }, [profile, plan?.title]);

  return { plan, setPlan, versions, loading, saving, save, restoreVersion, fetchSuggestions };
}
