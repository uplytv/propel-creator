import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import logo from "@/assets/logo.png";

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

  return (
    <section className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-20 pb-12">
      {/* Logo top-left handled by nav, also show big mark for hero feel */}
      <div className="absolute top-20 left-4 sm:left-6 flex items-center gap-2 opacity-80">
        <img src={logo} alt="UPLY" className="h-6 w-6 rounded" />
        <span className="font-display text-sm tracking-widest text-foreground/70">UPLY</span>
      </div>

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

        <p className="text-xs sm:text-sm text-primary/90 font-medium tracking-wide">
          Founding creator spots are open. 100,000 and they're gone.
        </p>
      </div>
    </section>
  );
}
