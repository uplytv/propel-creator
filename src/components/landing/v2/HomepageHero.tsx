import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import { ARIA_PLAN_NOTE, FEE_DISCLOSURE_SHORT } from "@/components/pricing/plans";

const ROTATING = [
  "If you're a musician, ToneDen is dead. We replaced it.",
  "If you stream, Twitch is taking half your money. We take 5%.",
  "If you teach, Kajabi charges $199/mo. We charge less and pay you more.",
  "If you sell, your products deserve a platform that keeps your margin.",
  "If you promote events, your fans are already here.",
];
const FINAL = "The AI-Powered Operating System for Creators.";

export default function HomepageHero() {
  const [idx, setIdx] = useState(0);
  const [settled, setSettled] = useState(true); // static headline — AI-OS positioning
  const [cycles, setCycles] = useState(0);
  const [betaCode, setBetaCode] = useState("");
  const [showBeta, setShowBeta] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => {
      const next = idx + 1;
      if (next >= ROTATING.length) {
        const c = cycles + 1;
        setCycles(c);
        if (c >= 3) {
          setSettled(true);
          return;
        }
        setIdx(0);
      } else {
        setIdx(next);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [idx, cycles, settled]);

  const headline = settled ? FINAL : ROTATING[idx];

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
        <p className="eyebrow-gold">For musicians, streamers, educators &amp; sellers</p>

        <div className="min-h-[140px] sm:min-h-[180px] flex items-center justify-center">
          <h1
            key={headline}
            className="type-display-xl text-foreground animate-fade-in"
          >
            {headline}
          </h1>
        </div>

        <p className="type-body-lg text-foreground/75 max-w-xl">
          Stream, sell courses, and run events from one dashboard — while your AI team
          handles the content, emails, and growth.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => setTrialOpen(true)}
            className="btn-primary-glow w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Start your 14-day free trial <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            to="/discover"
            className="btn-gold-outline w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Explore creators
          </Link>
        </div>

        {/* Risk reversal — the conversion line */}
        <p className="text-xs text-foreground/55 -mt-3">
          14 days free · No obligation · Cancel at any time
        </p>

        {/* Feature strip — plain text, informative without buttons */}
        <p className="text-xs sm:text-sm text-foreground/60 font-medium tracking-wide max-w-2xl leading-relaxed">
          AI growth team · Live streaming · Courses &amp; community · Music · Events &amp; tickets · Live shopping · Roku TV
        </p>

        {/* Plan clarity + onboarding — no scarcity claims */}
        <div className="flex flex-col items-center gap-2 max-w-xl">
          <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
            {ARIA_PLAN_NOTE}
          </p>
          <p className="text-xs text-foreground/55 leading-relaxed">
            Every plan includes a free setup call with a real person to help you get your pages,
            community and first offer live. A full done-for-you build is available as a separate paid
            service. {FEE_DISCLOSURE_SHORT}.
          </p>
        </div>

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

