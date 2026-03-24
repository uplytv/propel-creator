import { motion } from "framer-motion";

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  hype: number;
  dominant: "positive" | "neutral" | "negative" | "hype";
  emoji: string;
  history: { timestamp: number; positive: number; negative: number; hype: number }[];
}

interface ViewerSentimentOverlayProps {
  sentiment: SentimentData;
}

const moodColors: Record<string, string> = {
  positive: "bg-green-500",
  neutral: "bg-muted-foreground",
  negative: "bg-destructive",
  hype: "bg-primary",
};

const moodLabels: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  hype: "Hype",
};

export default function ViewerSentimentOverlay({ sentiment }: ViewerSentimentOverlayProps) {
  const bars = [
    { key: "hype", value: sentiment.hype, color: "bg-primary" },
    { key: "positive", value: sentiment.positive, color: "bg-green-500" },
    { key: "neutral", value: sentiment.neutral, color: "bg-muted-foreground" },
    { key: "negative", value: sentiment.negative, color: "bg-destructive" },
  ];

  return (
    <div className="glass-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            key={sentiment.emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-lg"
          >
            {sentiment.emoji}
          </motion.span>
          <span className="text-xs font-bold text-foreground">Chat Mood</span>
        </div>
        <span className="text-[10px] text-muted-foreground capitalize">
          {moodLabels[sentiment.dominant]}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
        {bars.map(
          (bar) =>
            bar.value > 0 && (
              <motion.div
                key={bar.key}
                className={`h-full ${bar.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${bar.value}%` }}
                transition={{ duration: 0.5 }}
              />
            )
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        {bars.map((bar) => (
          <div key={bar.key} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${bar.color}`} />
            <span className="text-[9px] text-muted-foreground">{bar.value}%</span>
          </div>
        ))}
      </div>

      {/* Mini sparkline */}
      {sentiment.history.length > 2 && (
        <div className="h-8 flex items-end gap-px">
          {sentiment.history.slice(-20).map((point, i) => (
            <div key={i} className="flex-1 flex flex-col gap-px">
              <div
                className="bg-primary/60 rounded-t-sm"
                style={{ height: `${Math.max(1, (point.hype / 100) * 32)}px` }}
              />
              <div
                className="bg-green-500/60"
                style={{ height: `${Math.max(1, (point.positive / 100) * 32)}px` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
