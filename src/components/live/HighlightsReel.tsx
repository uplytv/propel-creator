import { motion } from 'framer-motion';
import { Sparkles, Clock, TrendingUp } from 'lucide-react';
import type { HighlightMoment } from '@/hooks/useStreamHighlights';

interface HighlightsReelProps {
  highlights: HighlightMoment[];
  durationSeconds: number;
}

export default function HighlightsReel({ highlights, durationSeconds }: HighlightsReelProps) {
  if (highlights.length === 0) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Stream Highlights</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{highlights.length} top moments</span>
      </div>

      <div className="space-y-2">
        {highlights.map((moment, i) => (
          <motion.div
            key={`${moment.timestamp}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground min-w-[40px]">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(moment.timestamp)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{moment.label}</p>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">{moment.score}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
