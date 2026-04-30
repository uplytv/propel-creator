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
    <section className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-20 pb-12">
      {/* Animated green glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center gap-6 sm:gap-8">
        <div className="min-h-[140px] sm:min-h-[180px] flex items-center justify-center">
          <h1
            key={headline}
            className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight animate-fade-in"
          >
            {headline}
          </h1>
        </div>

        <p className="text-base sm:text-lg md:text-xl text-foreground/70 max-w-3xl leading-relaxed">
          Stream. Teach. Sell. Build Community. Release Music. Promote Events.
          Keep <span className="text-primary font-semibold">95%</span> of everything. One platform. Every screen — including Roku TV.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link to="/auth" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_hsl(var(--primary)/0.4)] font-bold">
              Get Up. Get UPLY <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <a href="#streamers" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-foreground/30 text-foreground hover:bg-foreground/5">
              <PlayCircle className="w-4 h-4 mr-1" /> Watch Demo
            </Button>
          </a>
        </div>

        {/* Milestone pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/40 text-primary text-xs sm:text-sm font-medium">
            <Trophy className="w-3.5 h-3.5" /> 100,000 Members
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/40 text-primary text-xs sm:text-sm font-medium">
            <Zap className="w-3.5 h-3.5" /> UPLY Awards
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/40 text-primary text-xs sm:text-sm font-medium">
            <Gamepad2 className="w-3.5 h-3.5" /> Creator Games
          </span>
        </div>

        <p className="text-xs sm:text-sm text-primary/90 font-medium tracking-wide max-w-xl">
          Founding creator spots are open.
          <br />
          100,000 members and this offer is gone — forever.
        </p>

        {/* Beta access card */}
        <div className="w-full max-w-md mx-auto rounded-2xl border border-primary/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 text-left shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
          <div className="flex flex-col gap-1 mb-4 text-center">
            <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Invite Only — Beta Access
            </span>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11"
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
