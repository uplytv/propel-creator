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
import PageHero from "@/components/layout/PageHero";
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
      { title: "Post to your community feed", to: "/create/post/editor", cta: "New post" },
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
  v === "high" ? "bg-primary/15 text-primary ring-1 ring-primary/20"
  : v === "medium" ? "bg-warning/10 text-warning ring-1 ring-warning/20"
  : "bg-secondary text-muted-foreground ring-1 ring-border";

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
    <>
      <PageHero
        eyebrow="Growth"
        title="Your next steps,"
        gradientWord="prioritized"
        subtitle="Actionable moves across plan, outreach, content, and monetization — tailored to where you are right now."
        actions={
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={loadCoach}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[hsl(280_85%_60%)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </motion.button>
        }
      />
      <div className="mobile-safe-content max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 md:space-y-10">
      {/* This week from ARIA */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 md:p-7"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent_55%)]" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This week's focus</h2>
          </div>

          {loading && actions.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> ARIA is reviewing your KPIs…
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 rounded-2xl border border-border bg-secondary/30 p-3.5">
                  <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-full animate-pulse rounded bg-secondary/70" />
                    <div className="flex gap-2">
                      <div className="h-4 w-20 animate-pulse rounded bg-secondary/70" />
                      <div className="h-4 w-20 animate-pulse rounded bg-secondary/70" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {headline && (
                <p className="mb-4 text-lg md:text-xl font-semibold leading-snug text-foreground">{headline}</p>
              )}
              <ol className="space-y-3">
                {actions.map((a, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3.5 transition-colors hover:border-primary/40 hover:bg-secondary/60"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{a.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.why}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono ${chipBy(a.impact)}`}>impact: {a.impact}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono ${chipBy(a.effort)}`}>effort: {a.effort}</span>
                      </div>
                    </div>
                  </motion.li>
                ))}
                {actions.length === 0 && !loading && (
                  <li className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
                    <Sparkles className="h-6 w-6 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">No suggestions yet — try Regenerate.</p>
                  </li>
                )}
              </ol>
            </>
          )}
        </div>
      </motion.section>

      {/* Tracks */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action tracks</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tracks.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3 }}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 md:p-6 transition-colors hover:border-primary/40"
              >
                <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-[hsl(280_85%_60%)]/10 text-primary ring-1 ring-primary/15">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold">{t.label}</h3>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">{t.blurb}</p>
                  <ul className="space-y-1.5">
                    {t.actions.map((a) => (
                      <li key={a.title}>
                        <Link
                          to={a.to}
                          className="flex items-center justify-between gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/60"
                        >
                          <span className="flex min-w-0 items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary/70" />
                            <span className="text-sm text-foreground">{a.title}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/5 px-2 py-1 text-xs font-semibold text-primary transition-colors group-hover:bg-primary/10">
                            {a.cta} <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Quick stats footer */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Members", value: profile.members ?? 0, icon: Users },
          { label: "MRR", value: `$${profile.mrr ?? 0}`, icon: DollarSign },
          { label: "Tier", value: profile.tier ?? 1, icon: TrendingUp },
          { label: "Focus", value: profile.challenge ?? "—", icon: Target },
        ].map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Icon className="h-3 w-3 text-primary/70" /> {label}
            </div>
            <div className="mt-1.5 truncate text-lg font-bold">{String(value)}</div>
          </motion.div>
        ))}
      </section>
    </div>
    </>
  );
}
