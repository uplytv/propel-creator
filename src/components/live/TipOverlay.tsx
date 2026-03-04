import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface TipEvent {
  id: string;
  user: string;
  amount: number;
  emoji: string;
  message?: string;
}

const tipEmojis: Record<string, string> = {
  "5": "☕",
  "25": "🔥",
  "50": "💎",
  "100": "🚀",
};

function getEmoji(amount: number) {
  return tipEmojis[amount.toString()] ?? "✨";
}

export default function TipOverlay() {
  const [tips, setTips] = useState<TipEvent[]>([]);

  // Simulate random tips from viewers
  useEffect(() => {
    const names = ["Alex M.", "Jordan K.", "Casey R.", "Quinn H.", "Pat D.", "Sam W.", "Dana S."];
    const amounts = [5, 25, 50, 100];
    const messages = [
      "Amazing content! 🔥",
      "Keep it up!",
      "This changed my perspective",
      "You're the best!",
      "",
      "Learned so much today",
      "",
    ];

    const interval = setInterval(() => {
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      const tip: TipEvent = {
        id: Date.now().toString(),
        user: names[Math.floor(Math.random() * names.length)],
        amount,
        emoji: getEmoji(amount),
        message: messages[Math.floor(Math.random() * messages.length)],
      };
      setTips((prev) => [...prev.slice(-5), tip]);

      // Auto-remove after animation
      setTimeout(() => {
        setTips((prev) => prev.filter((t) => t.id !== tip.id));
      }, 4000);
    }, 8000 + Math.random() * 7000);

    return () => clearInterval(interval);
  }, []);

  const addTip = (user: string, amount: number, message?: string) => {
    const tip: TipEvent = {
      id: Date.now().toString(),
      user,
      amount,
      emoji: getEmoji(amount),
      message,
    };
    setTips((prev) => [...prev.slice(-5), tip]);
    setTimeout(() => {
      setTips((prev) => prev.filter((t) => t.id !== tip.id));
    }, 4000);
  };

  return (
    <>
      {/* Tip notifications - bottom left of video */}
      <div className="absolute bottom-20 left-4 z-20 space-y-2 pointer-events-none max-w-xs">
        <AnimatePresence>
          {tips.map((tip) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, x: -40, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-background/80 backdrop-blur-md border border-warning/20 shadow-lg"
            >
              <span className="text-lg flex-shrink-0">{tip.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-warning">{tip.user}</span>
                  <span className="text-xs text-muted-foreground">tipped</span>
                  <span className="text-xs font-bold text-warning">{tip.amount}</span>
                </div>
                {tip.message && (
                  <p className="text-[11px] text-muted-foreground truncate">{tip.message}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating emoji burst for large tips */}
      <AnimatePresence>
        {tips.filter(t => t.amount >= 50).map((tip) => (
          <motion.div
            key={`burst-${tip.id}`}
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 2, y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl pointer-events-none z-30"
          >
            {tip.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}

// Export for manual triggering
export { getEmoji };
export type { TipEvent };
