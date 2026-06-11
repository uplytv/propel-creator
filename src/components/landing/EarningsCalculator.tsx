import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function formatCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

function formatFollowers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : n >= 10000 ? 0 : 1)}K`;
  return `${n}`;
}

function AnimatedNumber({ value, prefix = "$", className }: { value: number; prefix?: string; className?: string }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const start = display;
    const diff = value - start;
    const duration = 400;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isInView]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}
    </span>
  );
}

interface EarningsCalculatorProps {
  onCTAClick: () => void;
}

export default function EarningsCalculator({ onCTAClick }: EarningsCalculatorProps) {
  const [followers, setFollowers] = useState(10000);
  const ytEarnings = Math.round(followers * 0.003);
  const uplyEarnings = Math.round(followers * 0.02 * 9);
  const multiplier = ytEarnings > 0 ? Math.round(uplyEarnings / ytEarnings) : 0;

  return (
    <section className="py-16 md:py-24 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-4xl font-bold mb-3 font-heading">
            See what you'd actually make.
          </h2>
          <p className="text-white/40 text-sm md:text-base">
            AdSense pays pennies. Memberships pay rent.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-xl mx-auto rounded-xl border border-primary/10 bg-white/[0.02] p-6 md:p-8"
          style={{ boxShadow: "0 0 60px rgba(61, 124, 255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)" }}
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/50">How many followers do you have?</span>
              <span className="text-sm font-bold text-primary">{formatFollowers(followers)}</span>
            </div>
            <Slider
              min={1000} max={500000} step={1000}
              value={[followers]}
              onValueChange={(v) => setFollowers(v[0])}
              className="[&_[data-orientation=horizontal]>.relative]:bg-white/10 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_span[data-orientation=horizontal]>span]:bg-primary"
            />
            <div className="flex justify-between mt-2 text-[10px] text-white/20">
              <span>1K</span><span>10K</span><span>50K</span><span>100K</span><span>500K</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <span className="text-xs text-white/30 block mb-1">YouTube AdSense</span>
              <AnimatedNumber value={ytEarnings} className="text-2xl md:text-3xl font-bold text-red-400/70" />
              <span className="text-[10px] text-white/20 block mt-1">/month est.</span>
            </div>
            <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-4 text-center">
              <span className="text-xs text-primary/60 block mb-1">Uply Memberships</span>
              <AnimatedNumber value={uplyEarnings} className="text-2xl md:text-3xl font-bold text-primary" />
              <span className="text-[10px] text-primary/40 block mt-1">/month est.</span>
            </div>
          </div>

          {multiplier > 0 && (
            <p className="text-center text-lg md:text-xl font-bold mb-4">
              That's <span className="text-primary">{multiplier}x more</span> with Uply
            </p>
          )}

          <p className="text-[10px] text-white/15 text-center mb-5">
            Estimates based on industry averages. Results vary by niche and engagement.
          </p>

          <div className="flex justify-center">
            <Button className="bg-primary text-foreground font-bold hover:bg-primary/90 border-0 active:scale-[0.96] transition-transform" onClick={onCTAClick}>
              Start earning like this <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
