import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";

export default function HomepageFinalCTA() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative w-full min-h-[90svh] flex items-center justify-center px-4 sm:px-6 py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.03em] text-foreground leading-[1.08] mb-6">
          You weren't early to YouTube. You weren't early to Instagram.{" "}
          <span className="text-primary">You weren't early to TikTok Shop.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed mb-8">
          Start with community, courses and events on Free.
          UPLY is the AI-powered operating system for creators. The infrastructure. One platform
          that builds, runs, and grows the whole business with you.
        </p>
        <p className="text-foreground/60 mb-8">
          Pro $99/month · Studio $249/month · 0% UPLY fee on paid plans. Stripe processing extra.
        </p>

        <Button
          size="lg"
          onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_60px_hsl(var(--primary)/0.5)] font-bold text-base px-8 py-6 h-auto"
        >
          Compare creator plans <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <p className="mt-4 text-xs text-foreground/55">Free $0/month · Annual paid plans get 2 months free</p>
        <p className="mt-6 text-sm text-primary font-semibold">
          Founding 100: price locked for life
        </p>
      </div>

      <TrialSignupModal open={trialOpen} onOpenChange={setTrialOpen} defaultPlan="pro" />
    </section>
  );
}
