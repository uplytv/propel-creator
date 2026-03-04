import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";

const tierUnlocks: Record<string, string[]> = {
  Rising: ["Advanced analytics dashboard", "Priority AI insights", "Template library access"],
  Scaling: ["Dedicated success rep", "Custom growth plan", "Revenue optimization tools"],
  Elite: ["Executive strategy calls", "Co-marketing opportunities", "Direct Slack channel"],
};

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["hsl(152 100% 50%)", "hsl(0 0% 100%)", "hsl(152 100% 70%)"];
  const left = Math.random() * 100;
  const delay = Math.random() * 1;
  const size = 4 + Math.random() * 8;
  const color = colors[index % colors.length];
  const rotation = Math.random() * 360;

  return (
    <motion.div
      className="fixed z-[60] rounded-sm"
      style={{ left: `${left}%`, width: size, height: size * 1.5, backgroundColor: color, rotate: rotation }}
      initial={{ top: "-5%", opacity: 1 }}
      animate={{ top: "105%", opacity: 0, rotate: rotation + 720 }}
      transition={{ duration: 2 + Math.random() * 2, delay, ease: "easeIn" }}
    />
  );
}

export default function TierCelebration() {
  const { showCelebration, setShowCelebration, celebrationTier } = useApp();
  const [showCards, setShowCards] = useState(false);
  const unlocks = tierUnlocks[celebrationTier] || [];

  useEffect(() => {
    if (showCelebration) {
      const t = setTimeout(() => setShowCards(true), 800);
      return () => clearTimeout(t);
    }
    setShowCards(false);
  }, [showCelebration]);

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
        >
          {/* Confetti */}
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}

          <div className="text-center relative z-10 max-w-md">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-primary/20 glow-border flex items-center justify-center mx-auto mb-6"
            >
              <span className="text-4xl">🏆</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-4xl font-extrabold mb-3"
            >
              You just unlocked <span className="text-gradient">{celebrationTier}</span>!
            </motion.h1>

            {showCards && (
              <div className="space-y-3 mt-8">
                {unlocks.map((u, i) => (
                  <motion.div
                    key={u}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="glass-card p-4 flex items-center gap-3"
                  >
                    <span className="text-primary text-lg">✓</span>
                    <span className="text-sm font-medium">{u}</span>
                  </motion.div>
                ))}
              </div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
              <Button variant="hero" size="lg" className="mt-8" onClick={() => setShowCelebration(false)}>
                Explore Your New Features
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
