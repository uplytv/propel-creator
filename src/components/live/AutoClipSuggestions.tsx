import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIClipSuggestion } from "@/hooks/useAutoClipAI";

interface AutoClipSuggestionsProps {
  suggestions: AIClipSuggestion[];
  analyzing: boolean;
  onAnalyze: () => void;
  onCreateClip: (suggestion: AIClipSuggestion) => void;
  onSkip: (id: string) => void;
  hasHighlights: boolean;
}

export default function AutoClipSuggestions({
  suggestions,
  analyzing,
  onAnalyze,
  onCreateClip,
  onSkip,
  hasHighlights,
}: AutoClipSuggestionsProps) {
  const [expanded, setExpanded] = useState(true);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold text-foreground flex-1">AI Auto-Clips</p>
        {!suggestions.length && hasHighlights && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={onAnalyze}
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Scissors className="w-3 h-3 mr-1" />}
            {analyzing ? 'Analyzing...' : 'Find Clips'}
          </Button>
        )}
      </div>

      {analyzing && !suggestions.length && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">AI is finding clip-worthy moments...</p>
        </div>
      )}

      <AnimatePresence>
        {suggestions.filter(s => s.status !== 'skipped').map((suggestion, i) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 py-2 border-b border-border last:border-0"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">#{i + 1}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{suggestion.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatTime(suggestion.startTime)} → {formatTime(suggestion.endTime)} · Score: {suggestion.score}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{suggestion.reason}</p>
            </div>

            <div className="flex gap-1 shrink-0">
              {suggestion.status === 'suggested' && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onCreateClip(suggestion)}
                  >
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onSkip(suggestion.id)}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
              {suggestion.status === 'creating' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {suggestion.status === 'done' && (
                <Check className="w-4 h-4 text-green-400" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {!hasHighlights && !suggestions.length && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          No highlights data available for clip analysis
        </p>
      )}
    </div>
  );
}
