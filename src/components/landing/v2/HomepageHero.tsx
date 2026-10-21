import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";

const ROTATING = [
  "If you're a musician, ToneDen is dead. We replaced it.",
  "If you stream, Twitch is taking half your money. Free has a 3% UPLY fee. Pro and Studio have 0%.",
  "If you teach, start with community and courses on UPLY Free.",
  "If you sell, your products deserve a platform that keeps your margin.",
  "If you promote events, your fans are already here.",
];
const FINAL = "The AI-Powered Operating System for Creators.";

export default function HomepageHero() {
  const [idx, setIdx] = useState(0);
  const [settled, setSettled] = useState(true); // static headline , AI-OS positioning
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
          Community, courses and events on Free. Ticketing, PPV, ARIA AI and custom domain
          on Pro for $99/month, with 0% UPLY fees. Stripe processing extra.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="btn-primary-glow w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Compare creator plans <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            to="/discover"
            className="btn-gold-outline w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Explore creators
          </Link>
        </div>

        {/* Risk reversal , the conversion line */}
        <p className="text-xs text-foreground/55 -mt-3">
          Free $0/month · Pro $99/month · Studio $249/month
        </p>

        {/* Feature strip , plain text, informative without buttons */}
        <p className="text-xs sm:text-sm text-foreground/60 font-medium tracking-wide max-w-2xl leading-relaxed">
          AI growth team · Live streaming · Courses &amp; community · Music · Events &amp; tickets · Live shopping · Roku TV
        </p>

        {/* First-100 founding offer , scarcity chip */}
        <div className="inline-flex items-start sm:items-center gap-2 rounded-sm border border-gold-hairline bg-[hsl(var(--gold)/0.08)] px-4 py-2.5 max-w-xl text-left">
          <span className="rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shrink-0">
            Founding 100
          </span>
          <p className="text-xs sm:text-sm font-semibold text-foreground/85">
            Price locked for life. UPLY Build included with annual Studio billing.
          </p>
        </div>

        {/* Beta code , folded behind one small link */}
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

      <TrialSignupModal open={trialOpen} onOpenChange={setTrialOpen} defaultPlan="pro" />
    </section>
  );
}

