import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HypeTrainBannerProps {
  chatMessages: { id: string; created_at?: string }[];
}

const LEVELS = [
  { threshold: 5, label: "Level 1", color: "hsl(var(--primary))" },
  { threshold: 15, label: "Level 2", color: "#FF8C00" },
  { threshold: 30, label: "Level 3", color: "#FF4500" },
  { threshold: 50, label: "LEGENDARY", color: "#FFD700" },
];

export default function HypeTrainBanner({ chatMessages }: HypeTrainBannerProps) {
  const [level, setLevel] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const timestamps = useRef<number[]>([]);

  useEffect(() => {
    const now = Date.now();
    timestamps.current.push(now);
    // Keep only last 60 seconds
    timestamps.current = timestamps.current.filter((t) => now - t < 60_000);
    const count = timestamps.current.length;

    let newLevel = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (count >= LEVELS[i].threshold) {
        newLevel = i + 1;
        break;
      }
    }

    if (newLevel > level && newLevel >= 3) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    setLevel(newLevel);

    // Calculate progress to next level
    if (newLevel === 0) {
      setProgress(count / LEVELS[0].threshold);
    } else if (newLevel < LEVELS.length) {
      const current = LEVELS[newLevel - 1].threshold;
      const next = LEVELS[newLevel].threshold;
      setProgress((count - current) / (next - current));
    } else {
      setProgress(1);
    }
  }, [chatMessages.length]);

  if (level === 0) return null;

  const currentLevel = LEVELS[Math.min(level - 1, LEVELS.length - 1)];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mx-4 my-2 rounded-xl px-4 py-3 relative overflow-hidden"
        style={{
          background: `${currentLevel.color}12`,
          border: `1px solid ${currentLevel.color}4D`,
        }}
      >
        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  fontSize: 10,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random()}s`,
                }}
              >
                {["🎉", "✨", "🔥", "⚡"][Math.floor(Math.random() * 4)]}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-bold" style={{ color: currentLevel.color }}>
            🚂 HYPE TRAIN
          </span>
          <span
            className="text-xs font-extrabold px-2 py-0.5 rounded-full"
            style={{ background: `${currentLevel.color}33`, color: currentLevel.color }}
          >
            {currentLevel.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: currentLevel.color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Keep it going! 🔥
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
