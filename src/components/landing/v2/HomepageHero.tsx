import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, PlayCircle, Trophy, Zap, Gamepad2 } from "lucide-react";

const ROTATING = [
  "If you're a musician, ToneDen is dead. We replaced it.",
  "If you stream, Twitch is taking half your money. We take 5%.",
  "If you teach, Kajabi charges $199/mo. We charge less and pay you more.",
  "If you sell, your products deserve a platform that keeps your margin.",
  "If you promote events, your fans are already here.",
];
const FINAL = "The Platform That Actually Pays You.";

export default function HomepageHero() {
  const [idx, setIdx] = useState(0);
  const [settled, setSettled] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [betaCode, setBetaCode] = useState("");
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
        <p className="eyebrow-gold">The Creator Operating System</p>

        <div className="min-h-[140px] sm:min-h-[180px] flex items-center justify-center">
          <h1
            key={headline}
            className="type-display-xl text-foreground animate-fade-in"
          >
            {headline}
          </h1>
        </div>

        <p className="type-body-lg text-foreground/75 max-w-3xl">
          Stream. Teach. Sell. Build community. Release music. Promote events.
          Keep <span className="text-gold font-semibold">95%</span> of everything.
          One platform. Every screen — including Roku TV.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link
            to="/auth"
            className="btn-primary-glow w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full px-6 h-12 text-sm font-bold tracking-wide"
          >
            Get Up. Get UPLY <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#streamers"
            className="btn-gold-outline w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full px-6 h-12 text-sm font-bold tracking-wide"
          >
            <PlayCircle className="w-4 h-4" /> Watch Demo
          </a>
        </div>

        {/* Milestone pills — gold hairline edition */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold-hairline bg-card/40 text-foreground/85 text-xs sm:text-sm font-medium">
            <Trophy className="w-3.5 h-3.5 text-gold" /> 100,000 Members
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold-hairline bg-card/40 text-foreground/85 text-xs sm:text-sm font-medium">
            <Zap className="w-3.5 h-3.5 text-gold" /> UPLY Awards
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold-hairline bg-card/40 text-foreground/85 text-xs sm:text-sm font-medium">
            <Gamepad2 className="w-3.5 h-3.5 text-gold" /> Creator Games
          </span>
        </div>

        <p className="text-xs sm:text-sm text-foreground/70 font-medium tracking-wide max-w-xl">
          <span className="text-gold font-semibold">Founding creator spots are open.</span>
          <br />
          100,000 members and this offer is gone — forever.
        </p>

        {/* Beta access card */}
        <div className="w-full max-w-md mx-auto rounded-2xl border border-gold-hairline bg-card/60 backdrop-blur-md p-5 sm:p-6 text-left shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
          <div className="flex flex-col gap-1 mb-4 text-center">
            <span className="eyebrow-gold">Invite Only — Beta Access</span>
            <p className="text-sm text-foreground/70">
              Already have a beta code? Enter it below to bypass the waitlist.
            </p>
          </div>
          <form onSubmit={handleBetaSubmit} className="flex flex-col sm:flex-row gap-2">
            <Input
              value={betaCode}
              onChange={(e) => setBetaCode(e.target.value)}
              placeholder="Enter beta code"
              className="flex-1 bg-background/60 border-border/60 text-foreground placeholder:text-foreground/40 h-11 text-base"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="submit"
              className="btn-primary-glow h-11 font-semibold rounded-md"
            >
              Activate Access
            </Button>
          </form>
          <p className="text-xs text-foreground/55 mt-3 text-center">
            Don't have a code? Each founding creator gets 5 invites to share.
          </p>
        </div>
      </div>
    </section>
  );
}

