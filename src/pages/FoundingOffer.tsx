import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  Clock,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import HomepageNav from "@/components/landing/v2/HomepageNav";
import HomepageFooter from "@/components/landing/v2/HomepageFooter";
import SEOHead from "@/components/SEOHead";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import PlanCard from "@/components/pricing/PlanCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAffiliateCookie, setAffiliateCookie } from "@/lib/affiliateCookies";
import {
  EXTENDED_TRIAL_DAYS,
  PLATFORM_PLANS,
  type PlatformPlanKey,
} from "@/components/pricing/plans";

/**
 * /founding-offer — limited-time founding-creator landing page.
 *
 * Every item in the stack is REAL: the 30-day trial is enforced server-side
 * (create-platform-checkout clamps trial_days to {14,30}), the setup call is
 * the existing human-led onboarding call, the badge is the existing
 * is_founding_creator profile flag, and cancel-anytime is how the trial
 * already works. No fake countdown timers.
 *
 * Affiliate attribution: ?ref=<code> sets the uply_ref cookie (30 days).
 * Attribution only — commissions are UPLY's marketing cost on its own plan
 * revenue, computed server-side. Pricing is identical with or without a code.
 */

const REF_CODE_RE = /^[A-Za-z0-9_-]{3,64}$/;

const STACK = [
  {
    icon: Clock,
    title: "30 days free — double the standard trial",
    body: "Every founding creator gets 30 days instead of 14. A full month to move your community in, launch a course, run a live stream, and see real revenue before you pay a dollar.",
  },
  {
    icon: CalendarCheck,
    title: "Done-for-you setup call",
    body: "A real person builds with you on a live call: your website funnel, an SEO blog post, and your community & course setup. You leave the call with something you can sell from — not a blank dashboard.",
  },
  {
    icon: BadgeCheck,
    title: "Founding Creator badge + rate lock",
    body: "A permanent Founding Creator badge on your profile, and our rate-lock promise: your plan price never increases while you stay subscribed. Whatever we charge new creators later, your number doesn't move.",
  },
  {
    icon: ShieldCheck,
    title: "Cancel anytime — genuinely",
    body: "Cancel during the trial and you pay nothing. Cancel later and you keep access through the period you paid for. No calls to a retention desk, no exit forms.",
  },
];

const COMPARISON = [
  { alone: "Piece together 4–6 subscriptions that don't talk to each other", uply: "One login: site, community, courses, events, live, email" },
  { alone: "Spend weekends wiring landing pages and checkout links", uply: "A human builds your funnel with you on the setup call" },
  { alone: "Give platforms 10–50% of what your audience pays you", uply: "You keep 95% of everything you earn — always" },
  { alone: "14-day trials that end before your first launch", uply: "30 full days to launch something real before you pay" },
  { alone: "Prices that creep up every renewal cycle", uply: "Founding rate lock — your price never increases while subscribed" },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is the 30-day trial actually free?",
    a: "Yes. You add a card to start (that's how the trial converts if you decide to stay), but nothing is charged for 30 days. Cancel any time in that window and the charge simply never happens.",
  },
  {
    q: "What happens when the trial ends?",
    a: "Your card is billed for the plan you picked — $97, $297, or $497 per month — and everything keeps running. Cancel before day 30 and you pay nothing; cancel later and you keep access through the month you paid for.",
  },
  {
    q: "What exactly happens on the setup call?",
    a: "A UPLY team member shares a screen with you and builds: your website funnel, one SEO-ready blog post, and your community and course structure. It's a working session, not a sales demo — you end the call with pages that are live.",
  },
  {
    q: "What does the founding rate lock cover?",
    a: "The monthly price of the plan you subscribe to today never increases while your subscription stays active. If you cancel and come back later, you rejoin at whatever pricing exists then — the lock rewards staying.",
  },
  {
    q: "I got here through a creator's link. Does that change my price?",
    a: "No. Your price is identical either way. The creator who invited you earns a one-time referral commission that UPLY pays out of its own plan revenue — it never comes from your pocket, and it never touches any creator's 95% earnings payout.",
  },
  {
    q: "Does UPLY take a cut of what I earn?",
    a: "You keep 95% of everything you earn on the platform — subscriptions, tips, courses, tickets, products. UPLY's 5% covers payments infrastructure. The monthly plan is the software; your earnings split never changes with plan tier.",
  },
];

export default function FoundingOffer() {
  const [searchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>("unlimited");
  const [foundingCount, setFoundingCount] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [referred, setReferred] = useState(false);

  // ?ref=<code> → uply_ref cookie (30 days) + click count. Attribution only —
  // the price is the same with or without a code, and commission math lives
  // server-side in the reconciler. Never client-supplied amounts.
  useEffect(() => {
    const raw = searchParams.get("ref")?.trim() ?? "";
    if (raw && REF_CODE_RE.test(raw)) {
      setAffiliateCookie("uply_ref", raw, 30);
      supabase.functions
        .invoke("track-affiliate-conversion", {
          body: { affiliate_code: raw, conversion_type: "click" },
        })
        .catch(() => {});
    }
    setReferred(!!getAffiliateCookie("uply_ref"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Honest scarcity: real count of founding-creator profiles when we can read
  // it cheaply; otherwise the static copy below. No fake countdowns.
  useEffect(() => {
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_founding_creator", true)
      .then(({ count, error }) => {
        if (!error && typeof count === "number") setFoundingCount(count);
      });
  }, []);

  const scarcityLine = useMemo(() => {
    if (foundingCount !== null && foundingCount >= 1 && foundingCount < 100) {
      return `${foundingCount} of the first 100 founding spots are taken`;
    }
    return "Limited to the first 100 founding creators";
  }, [foundingCount]);

  const openTrial = (planKey: PlatformPlanKey) => {
    setSelectedPlan(planKey);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Founding Creator Offer — 30 Days Free + Done-For-You Setup"
        description="Join UPLY as a founding creator: a 30-day free trial (double the standard), a human-built setup call, a permanent founding badge, and a rate-lock promise. Limited to the first 100 creators."
      />
      <HomepageNav />

      <main className="pt-20 sm:pt-24">
        {/* Affiliate attribution banner — only when a real referral cookie exists */}
        {referred && (
          <div className="border-y border-primary/30 bg-primary/5 px-4 py-2.5 text-center text-sm">
            <Sparkles className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden />
            <span className="font-semibold text-foreground">Invited by a UPLY creator</span>
            <span className="text-muted-foreground"> — your extended 30-day trial is unlocked below.</span>
          </div>
        )}

        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pt-14">
          <p className="eyebrow-gold mb-4">Founding Creator Offer</p>
          <h1 className="type-display-xl mx-auto max-w-3xl text-foreground">
            Everything you need to get paid as a creator.
            <span className="block bg-[linear-gradient(90deg,hsl(var(--primary)),#B025FF)] bg-clip-text text-transparent">
              Free for your first 30 days.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/70 sm:text-lg">
            The full UPLY platform, a setup call where a real person builds your funnel with
            you, a permanent founding badge, and a price that never goes up on you. Then $97,
            $297, or $497 a month — only if you stay.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="btn-primary-glow h-12 rounded-none px-8 text-base font-bold"
              onClick={() => openTrial("unlimited")}
            >
              Claim my 30-day founding trial
            </Button>
            <p className="text-xs text-muted-foreground">
              {EXTENDED_TRIAL_DAYS} days free · No obligation · Cancel at any time
            </p>
            <p className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
              {scarcityLine}
            </p>
          </div>
        </section>

        {/* The stack */}
        <section className="border-t border-border/60 bg-card/30 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="eyebrow-gold mb-3">What founding creators get</p>
              <h2 className="type-display-lg text-foreground">The whole stack, stacked in your favor</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {STACK.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="card-editorial p-6">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-foreground">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-foreground/70">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Plans with 30-day framing */}
        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="eyebrow-gold mb-3">Pick your plan</p>
              <h2 className="type-display-lg text-foreground">
                Every plan starts with 30 free days
              </h2>
              <p className="mt-3 text-foreground/70">
                Same plans as everyone else — founding creators just get twice the runway and
                the rate lock. You keep 95% of what you earn on all of them.
              </p>
            </div>
            <div className="grid max-w-5xl gap-5 md:grid-cols-3">
              {PLATFORM_PLANS.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  trialDays={EXTENDED_TRIAL_DAYS}
                  onStartTrial={(p) => openTrial(p.key)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Comparison: with UPLY vs alone */}
        <section className="border-t border-border/60 bg-card/30 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <p className="eyebrow-gold mb-3">The honest comparison</p>
              <h2 className="type-display-lg text-foreground">Doing it alone vs. doing it here</h2>
            </div>
            <div className="card-editorial overflow-hidden">
              <div className="grid grid-cols-2 border-b border-border/60 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:px-6 sm:text-xs">
                <div>Doing it alone</div>
                <div className="text-primary">As a founding creator</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.uply}
                  className={`grid grid-cols-2 items-center gap-4 px-4 py-3.5 text-sm sm:px-6 ${i % 2 ? "bg-card/40" : ""}`}
                >
                  <div className="text-muted-foreground">{row.alone}</div>
                  <div className="font-semibold text-foreground">{row.uply}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <p className="eyebrow-gold mb-3">Before you ask</p>
              <h2 className="type-display-lg text-foreground">Straight answers</h2>
            </div>
            <div className="divide-y divide-border border border-border">
              {FAQ.map((item, i) => (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-bold text-foreground">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {openFaq === i && (
                    <p className="px-5 pb-5 text-sm leading-relaxed text-foreground/70">{item.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 bg-card/30 px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-display-lg text-foreground">
              The founding window closes at 100 creators.
            </h2>
            <p className="mt-3 text-foreground/70">
              After that, it's the standard 14-day trial and standard pricing terms. Thirty
              free days, a human-built setup, and a locked rate — or the regular door later.
            </p>
            <Button
              size="lg"
              className="btn-primary-glow mt-6 h-12 rounded-none px-8 text-base font-bold"
              onClick={() => openTrial("unlimited")}
            >
              Start my 30 free days
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              {EXTENDED_TRIAL_DAYS} days free · No obligation · Cancel at any time
            </p>
          </div>
        </section>
      </main>

      <HomepageFooter />

      <TrialSignupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultPlan={selectedPlan}
        trialDays={EXTENDED_TRIAL_DAYS}
      />
    </div>
  );
}
