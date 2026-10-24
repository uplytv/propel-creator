import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CreditCard, Radio, Tag } from "lucide-react";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import { TRIAL_CARD_PROMISE } from "@/components/pricing/plans";

const HEADLINE = "Turn your audience into income.";

/** Real surfaces on the published plans — not a feature wishlist. */
const SELL_STEPS = [
  { icon: CreditCard, title: "Connect Stripe", body: "Payouts land in your own account." },
  { icon: Tag, title: "Set a price", body: "Membership, ticket, or pay-per-view." },
  { icon: Radio, title: "Go live", body: "Fans pay to watch. You keep 95%." },
];

export default function HomepageHero() {
  const [betaCode, setBetaCode] = useState("");
  const [showBeta, setShowBeta] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const navigate = useNavigate();

  const handleBetaSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = betaCode.trim();
    if (!code) {
      navigate("/auth");
      return;
    }
    navigate(`/auth?code=${encodeURIComponent(code)}`);
  };

  return (
    <section className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-24 pb-16">
      {/* Ambient purple + gold glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute right-[10%] top-[18%] w-[40vw] h-[40vw] max-w-[420px] max-h-[420px] rounded-full bg-[hsl(var(--gold)/0.10)] blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center gap-6 sm:gap-8">
        <p className="eyebrow-gold">For creators who already have an audience</p>

        <div className="min-h-[140px] sm:min-h-[180px] flex items-center justify-center">
          <h1 className="type-display-xl text-foreground">
            {HEADLINE}
          </h1>
        </div>

        <p className="type-body-lg text-foreground/75 max-w-xl">
          Sell memberships, tickets, and pay-per-view. Live tips, courses, and events are included.
          Pay-per-view is on Unlimited and Agency Pro. You keep 95%.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => setTrialOpen(true)}
            className="btn-primary-glow w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Start your 14-day free trial <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTrialOpen(true)}
            className="btn-gold-outline w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Start selling
          </button>
        </div>

        <p className="text-xs text-foreground/60 max-w-lg leading-relaxed -mt-2">
          {TRIAL_CARD_PROMISE}{" "}
          <a href="#fees" className="underline underline-offset-4 hover:text-foreground">
            See fees
          </a>
        </p>

        <ol className="grid w-full max-w-3xl grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {SELL_STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-border bg-card/80 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <step.icon className="w-4 h-4 text-primary" aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">0{i + 1}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.body}</p>
            </li>
          ))}
        </ol>

        {/* Beta code — folded behind one small link */}
        {!showBeta ? (
          <button
            onClick={() => setShowBeta(true)}
            className="text-xs text-foreground/55 underline underline-offset-4 hover:text-foreground/80 transition-colors"
          >
            Have a beta code?
          </button>
        ) : (
          <form onSubmit={handleBetaSubmit} className="flex w-full max-w-sm mx-auto gap-2">
            <Input
              value={betaCode}
              onChange={(e) => setBetaCode(e.target.value)}
              placeholder="Enter beta code"
              className="flex-1 bg-background/60 border-border/60 text-foreground placeholder:text-foreground/40 h-11 text-base"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            <Button type="submit" className="btn-primary-glow h-11 font-semibold rounded-md">
              Activate
            </Button>
          </form>
        )}
      </div>

      <TrialSignupModal open={trialOpen} onOpenChange={setTrialOpen} defaultPlan="starter" />
    </section>
  );
}

