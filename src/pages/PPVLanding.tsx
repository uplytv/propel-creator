import { useState } from "react";
import { Link } from "react-router-dom";
import { Radio, DollarSign, Users, Globe, Lock, Play, ArrowRight, Ticket, BarChart3 } from "lucide-react";
import HomepageNav from "@/components/landing/v2/HomepageNav";
import HomepageFooter from "@/components/landing/v2/HomepageFooter";
import SEOHead from "@/components/SEOHead";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import StickyTrialBar from "@/components/landing/v2/StickyTrialBar";
import { TRIAL_CARD_PROMISE } from "@/components/pricing/plans";

const STEPS = [
  { icon: Radio, title: "Go live", body: "Start a stream or attach a pass to an event." },
  { icon: Ticket, title: "Set the price", body: "Fans pay that price before they watch. Pay-per-view is on Unlimited and Agency Pro." },
  { icon: DollarSign, title: "You keep 95%", body: "The charge is transferred to your Stripe account. Stripe’s own fees are separate." },
];

const AUDIENCE = [
  { icon: Radio, title: "Concerts & DJ sets", body: "Sell a global front-row seat to fans who can't be in the room." },
  { icon: Users, title: "Workshops & masterclasses", body: "Charge for live teaching, coaching, and Q&A — no Zoom links, no leaks." },
  { icon: Globe, title: "Events & festivals", body: "Add a PPV livestream to any event so anyone, anywhere can buy in." },
  { icon: BarChart3, title: "Creators & shows", body: "Premiere drops, fights, podcasts, and specials behind a paywall you control." },
];

function Glows() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 -top-1/4 -translate-x-1/2 w-[70vw] h-[70vw] max-w-[820px] max-h-[820px] rounded-full bg-primary/15 blur-[130px]" />
      <div className="absolute right-[6%] top-[12%] w-[34vw] h-[34vw] max-w-[360px] max-h-[360px] rounded-full bg-[hsl(var(--gold)/0.10)] blur-[120px]" />
    </div>
  );
}

export default function PPVLanding() {
  const [trialOpen, setTrialOpen] = useState(false);
  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased pb-20 md:pb-0">
      <SEOHead
        title="Pay-Per-View Live Streaming · UPLY"
        description="Sell tickets to your live stream. Set any price, keep 95%, and let fans watch from anywhere. Pay-per-view live streaming for creators, events, and shows on UPLY."
        canonicalUrl="https://uply.tv/ppv"
      />
      <HomepageNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-28 pb-20 sm:pt-32 sm:pb-24">
        <Glows />
        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <p className="eyebrow-gold inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive motion-reduce:animate-none animate-pulse" /> Pay-per-view
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Sell tickets to your{" "}
            <span className="bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] bg-clip-text text-transparent">live stream.</span>
            <br className="hidden sm:block" /> Keep 95%.
          </h1>
          <p className="text-base sm:text-lg text-foreground/80 max-w-2xl">
            Charge fans to watch you live. Set the price, stream in HD, and keep{" "}
            <span className="text-gold font-semibold">95%</span> of the charge. Pay-per-view is on Unlimited and Agency Pro.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTrialOpen(true)}
              className="btn-primary-glow w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-6 h-12 text-sm font-bold tracking-wide"
            >
              Start your 14-day free trial <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/discover" className="btn-gold-outline w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-6 h-12 text-sm font-bold tracking-wide">
              <Play className="w-4 h-4" /> See live now
            </Link>
          </div>
          <p className="text-sm text-foreground/80 max-w-lg">{TRIAL_CARD_PROMISE}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/80 pt-2">
            <span className="inline-flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-gold" /> 95% payout</span>
            <span className="inline-flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-gold" /> Watch anywhere</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-gold" /> Secure paywall</span>
            <span className="inline-flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-gold" /> HD + Roku TV</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow-gold mb-2">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Live and monetized in three steps</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-xl border border-border bg-card p-6 shadow-[var(--card-shadow)]">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="absolute top-5 right-5 text-xs font-bold text-muted-foreground">0{i + 1}</span>
                <h3 className="font-bold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="relative px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow-gold mb-2">Made for</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Anyone with something worth watching</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="rounded-xl border border-border bg-card p-5 shadow-[var(--card-shadow)]">
                <a.icon className="w-5 h-5 text-gold mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">{a.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Economics */}
      <section className="relative overflow-hidden px-4 py-20 border-t border-border">
        <Glows />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="eyebrow-gold mb-2">The math</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            You keep <span className="text-gold">95%.</span>
          </h2>
          <p className="text-base text-foreground/80 mt-4 max-w-xl mx-auto">
            UPLY’s platform fee is a flat 5% of the charge. Stripe’s processing and payout fees are separate, and your plan is billed separately.
          </p>
          <div className="mt-8 inline-flex flex-col sm:flex-row items-stretch gap-3">
            <div className="rounded-xl border border-border bg-card px-6 py-4 text-left">
              <p className="text-xs text-muted-foreground">Sell 1,000 passes at $15</p>
              <p className="text-2xl font-extrabold text-foreground">$15,000</p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/5 px-6 py-4 text-left">
              <p className="text-sm text-gold">You keep 95% of the charge, before Stripe fees</p>
              <p className="text-2xl font-extrabold text-gold">$14,250</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-4 py-20 border-t border-border text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Your next stream should pay you.</h2>
          <p className="text-foreground/70 max-w-lg">{TRIAL_CARD_PROMISE}</p>
          <button
            type="button"
            onClick={() => setTrialOpen(true)}
            className="btn-primary-glow inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Start your 14-day free trial <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <HomepageFooter />
      <TrialSignupModal open={trialOpen} onOpenChange={setTrialOpen} defaultPlan="unlimited" />
      <StickyTrialBar onStart={() => setTrialOpen(true)} />
    </div>
  );
}
