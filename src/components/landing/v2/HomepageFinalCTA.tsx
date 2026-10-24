import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import { TRIAL_CARD_PROMISE } from "@/components/pricing/plans";

export default function HomepageFinalCTA() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative w-full min-h-[90svh] flex items-center justify-center px-4 sm:px-6 py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.03em] text-foreground leading-[1.08] mb-6">
          Run the whole creator business{" "}
          <span className="text-primary">from one login.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed mb-8">
          Streaming, community, courses, ticketed events and the follow-up list — plus ARIA drafting
          the content you review and publish. Try the whole platform for 14 days.
        </p>
        <p className="text-foreground/60 mb-8">
          Start selling from this page. Card on file, $0 due today.
        </p>

        <Button
          size="lg"
          onClick={() => setTrialOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_60px_hsl(var(--primary)/0.5)] font-bold text-base px-8 py-6 h-auto"
        >
          Start your 14-day free trial <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <p className="mt-4 text-xs text-foreground/55 max-w-lg mx-auto">{TRIAL_CARD_PROMISE}</p>
        <p className="mt-6 text-sm text-foreground/60">
          Flat 5% UPLY platform fee on sales · Stripe's own processing and payout fees apply separately.
        </p>
      </div>

      <TrialSignupModal open={trialOpen} onOpenChange={setTrialOpen} defaultPlan="starter" />
    </section>
  );
}
