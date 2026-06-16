import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, Target, Mail, Video, DollarSign, ArrowUpRight,
  RefreshCw, Zap, Users, TrendingUp, Loader2, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useGrowthPlan } from "@/hooks/useGrowthPlan";
import { toast } from "sonner";

type CoachAction = { title: string; why: string; effort: "low"|"medium"|"high"; impact: "low"|"medium"|"high" };

const tracks = [
  {
    id: "plan",
    label: "Plan",
    icon: Target,
    blurb: "Tighten your 30-day growth plan and weekly focus.",
    actions: [
      { title: "Review & edit your Growth Plan", to: "/grow", cta: "Open plan" },
      { title: "Snapshot this week before changes", to: "/grow", cta: "Snapshot" },
      { title: "Set or update target KPIs (members, MRR, tier)", to: "/grow", cta: "Set KPIs" },
    ],
  },
  {
    id: "outreach",
    label: "Outreach",
    icon: Mail,
    blurb: "Get more members in front of your offer.",
    actions: [
      { title: "Email your subscriber list", to: "/newsletter", cta: "Compose" },
      { title: "Launch a referral push to existing members", to: "/dashboard/referrals", cta: "Boost referrals" },
      { title: "DM 5 high-intent followers with a Paid DM offer", to: "/messages", cta: "Open DMs" },
    ],
  },
  {
    id: "content",
    label: "Content",
    icon: Video,
    blurb: "Ship one piece of content this week that compounds.",
    actions: [
      { title: "Schedule a livestream in your peak window", to: "/dashboard/broadcast", cta: "Go Live" },
      { title: "Clip your last stream into a Short", to: "/content-library", cta: "Open library" },
      { title: "Post to your community feed", to: "/create/post", cta: "New post" },
    ],
  },
  {
    id: "monetization",
    label: "Monetization",
    icon: DollarSign,
    blurb: "Turn attention into recurring revenue.",
    actions: [
      { title: "Launch or refresh a digital product", to: "/products", cta: "Open products" },
      { title: "Add or test a paid community tier", to: "/dashboard/tiers", cta: "Manage tiers" },
      { title: "Drop a limited-time event ticket", to: "/events/create", cta: "Create event" },
    ],
  },
] as const;

const chipBy = (v: string) =>
  v === "high" ? "bg-primary/15 text-primary"
  : v === "medium" ? "bg-warning/10 text-warning"
  : "bg-secondary text-muted-foreground";

export default function GrowthAssistant() {
  const { profile } = useApp();
  const { plan } = useGrowthPlan();
  const [loading, setLoading] = useState(false);
  const [headline, setHeadline] = useState<string>("");
  const [actions, setActions] = useState<CoachAction[]>([]);

  const loadCoach = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-coach-suggest", {
        body: {
          context: {
            creatorName: profile.name,
            tier: profile.tier,
            members: profile.members,
            mrr: profile.mrr,
            challenge: profile.challenge,
            planTitle: plan?.title,
            targetKpis: plan?.targetKpis,
            weeklyTasks: (plan?.weeklyTasks ?? []).map((t: any) => t.title ?? t),
            milestones: (plan?.milestones ?? []).map((m: any) => m.title ?? m),
          },
        },
      });
      if (error) throw error;
      setHeadline(data?.headline ?? "");
      setActions(data?.actions ?? []);
    } catch (e: any) {
      const msg = e?.message?.includes("429") ? "Slow down — try again shortly."
        : e?.message?.includes("402") ? "AI credits exhausted. Add credits in workspace settings."
        : "Couldn't load Growth Assistant suggestions";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [profile, plan]);

  useEffect(() => { loadCoach(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [plan?.id]);

  return (
    <div className="mobile-safe-content max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">ARIA · Growth Assistant</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your next steps, prioritized</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Actionable moves across plan, outreach, content, and monetization — tailored to where you are right now.
          </p>
        </div>
        <button
          onClick={loadCoach}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Regenerate
        </button>
      </header>

      {/* This week from ARIA */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border p-5 md:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This week's focus</h2>
          </div>
          {loading && actions.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> ARIA is reviewing your KPIs…
            </div>
          ) : (
            <>
              {headline && <p className="text-lg font-semibold mb-4">{headline}</p>}
              <ol className="space-y-3">
                {actions.map((a, i) => (
                  <li key={i} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/40 border border-border">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.why}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${chipBy(a.impact)}`}>impact: {a.impact}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${chipBy(a.effort)}`}>effort: {a.effort}</span>
                      </div>
                    </div>
                  </li>
                ))}
                {actions.length === 0 && !loading && (
                  <li className="text-sm text-muted-foreground">No suggestions yet — try Regenerate.</li>
                )}
              </ol>
            </>
          )}
        </div>
      </motion.section>

      {/* Tracks */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Action tracks</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {tracks.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-semibold">{t.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t.blurb}</p>
                <ul className="space-y-2">
                  {t.actions.map((a) => (
                    <li key={a.title} className="flex items-start justify-between gap-3 p-2.5 rounded-lg hover:bg-secondary/60 transition-colors">
                      <div className="flex items-start gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-sm">{a.title}</span>
                      </div>
                      <Link
                        to={a.to}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {a.cta} <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Quick stats footer */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Members", value: profile.members ?? 0, icon: Users },
          { label: "MRR", value: `$${profile.mrr ?? 0}`, icon: DollarSign },
          { label: "Tier", value: profile.tier ?? 1, icon: TrendingUp },
          { label: "Focus", value: profile.challenge ?? "—", icon: Target },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Icon className="w-3 h-3" /> {label}
            </div>
            <div className="text-base font-bold mt-1 truncate">{String(value)}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
