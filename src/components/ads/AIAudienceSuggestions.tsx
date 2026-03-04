import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, TrendingUp, Clock, Users, Target, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIAudienceSuggestionsProps {
  objective: string | null;
  budget: number;
  duration: number;
  onApplySuggestion: (suggestion: AISuggestion) => void;
}

export interface AISuggestion {
  audienceId: string;
  budgetRecommendation?: number;
  durationRecommendation?: number;
  reasoning: string;
}

interface InsightCard {
  id: string;
  type: "audience" | "budget" | "timing";
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  audienceId?: string;
  budgetRec?: number;
  durationRec?: number;
  confidence: number;
  icon: typeof Brain;
}

const demographicInsights: Record<string, InsightCard[]> = {
  awareness: [
    {
      id: "aw-1",
      type: "audience",
      title: "Lookalike Audiences Perform Best",
      description: "Members aged 25–34 drive 68% of engagement. A lookalike audience based on this cohort yields 3.2× higher reach.",
      metric: "3.2×",
      metricLabel: "higher reach",
      audienceId: "lookalike",
      confidence: 94,
      icon: Users,
    },
    {
      id: "aw-2",
      type: "timing",
      title: "Peak Engagement Window",
      description: "Your community is most active Tue–Thu, 7–9 PM. Scheduling ads during this window increases impressions by 41%.",
      metric: "+41%",
      metricLabel: "impressions",
      confidence: 87,
      icon: Clock,
    },
    {
      id: "aw-3",
      type: "budget",
      title: "Optimal Daily Spend",
      description: "Based on your member growth rate, $25/day hits the efficiency sweet spot — higher spend shows diminishing returns above $35.",
      metric: "$25",
      metricLabel: "optimal/day",
      budgetRec: 25,
      durationRec: 14,
      confidence: 91,
      icon: TrendingUp,
    },
  ],
  leads: [
    {
      id: "ld-1",
      type: "audience",
      title: "Retarget Stream Viewers",
      description: "72% of stream viewers who watched 5+ min haven't joined yet. Retargeting converts them at 4.8× the rate of cold traffic.",
      metric: "4.8×",
      metricLabel: "conversion rate",
      audienceId: "stream-viewers",
      confidence: 92,
      icon: Target,
    },
    {
      id: "ld-2",
      type: "budget",
      title: "Lower Budget, Longer Run",
      description: "For lead gen, sustained exposure outperforms bursts. $10/day for 14 days yields 23% more leads than $25/day for 7 days.",
      metric: "+23%",
      metricLabel: "more leads",
      budgetRec: 10,
      durationRec: 14,
      confidence: 88,
      icon: TrendingUp,
    },
    {
      id: "ld-3",
      type: "audience",
      title: "Page Visitor Retargeting",
      description: "Visitors who viewed your product pages are 6.1× more likely to become members when retargeted within 7 days.",
      metric: "6.1×",
      metricLabel: "join rate",
      audienceId: "page-visitors",
      confidence: 85,
      icon: Users,
    },
  ],
  conversions: [
    {
      id: "cv-1",
      type: "audience",
      title: "High-Intent Page Visitors",
      description: "Members with 3+ page visits have an 82% purchase probability. Retargeting them drives 5.3× ROAS.",
      metric: "5.3×",
      metricLabel: "ROAS",
      audienceId: "page-visitors",
      confidence: 96,
      icon: Zap,
    },
    {
      id: "cv-2",
      type: "budget",
      title: "Aggressive Short Burst",
      description: "For conversion campaigns, front-loading spend works best. $50/day for 7 days outperforms $25/day for 14 days by 34%.",
      metric: "+34%",
      metricLabel: "more conversions",
      budgetRec: 50,
      durationRec: 7,
      confidence: 89,
      icon: TrendingUp,
    },
    {
      id: "cv-3",
      type: "audience",
      title: "AI-Optimized Broad",
      description: "With conversion data from your products, broad targeting with AI optimization finds high-intent users at 40% lower CPA.",
      metric: "-40%",
      metricLabel: "lower CPA",
      audienceId: "broad",
      confidence: 83,
      icon: Brain,
    },
  ],
};

export default function AIAudienceSuggestions({ objective, budget, duration, onApplySuggestion }: AIAudienceSuggestionsProps) {
  const [analyzing, setAnalyzing] = useState(true);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  useEffect(() => {
    setAnalyzing(true);
    setAppliedId(null);
    const timer = setTimeout(() => {
      setInsights(demographicInsights[objective ?? "awareness"] ?? demographicInsights.awareness);
      setAnalyzing(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [objective]);

  const handleApply = (insight: InsightCard) => {
    setAppliedId(insight.id);
    onApplySuggestion({
      audienceId: insight.audienceId ?? "",
      budgetRecommendation: insight.budgetRec,
      durationRecommendation: insight.durationRec,
      reasoning: insight.title,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Insights</span>
        {analyzing && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-[10px] text-muted-foreground ml-auto"
          >
            Analyzing demographics…
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {insights.map((insight, i) => {
              const isApplied = appliedId === insight.id;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl border p-3 transition-all cursor-pointer group ${
                    isApplied
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-secondary/20"
                  }`}
                  onClick={() => handleApply(insight)}
                >
                  <div className="flex items-start gap-3">
                    {/* Metric badge */}
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                      isApplied ? "bg-primary/15" : "bg-secondary"
                    }`}>
                      <span className={`text-sm font-bold ${isApplied ? "text-primary" : "text-foreground"}`}>
                        {insight.metric}
                      </span>
                      <span className="text-[8px] text-muted-foreground leading-none">{insight.metricLabel}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <insight.icon className={`w-3 h-3 ${isApplied ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-semibold truncate">{insight.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{insight.confidence}%</span>
                        </div>
                        {isApplied ? (
                          <span className="text-[10px] font-semibold text-primary flex items-center gap-0.5 ml-auto">
                            <Sparkles className="w-3 h-3" /> Applied
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            Apply <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
