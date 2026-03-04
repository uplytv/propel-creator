import { motion } from "framer-motion";
import { Sparkles, ArrowUpRight, Zap, TrendingUp, AlertTriangle, Target } from "lucide-react";

const suggestions = [
  {
    type: "upsell" as const,
    icon: TrendingUp,
    title: "Upsell Opportunity Detected",
    description: "247 Community members haven't purchased your Mastermind Pro. Based on engagement patterns, 34% are likely to convert with a time-limited offer.",
    action: "Launch Upsell Campaign",
    impact: "+$41K potential revenue",
    confidence: 89,
  },
  {
    type: "churn" as const,
    icon: AlertTriangle,
    title: "Churn Risk: 23 Members",
    description: "23 members haven't logged in for 14+ days and are likely to cancel. AI recommends a personalized re-engagement email sequence.",
    action: "Activate Retention Flow",
    impact: "Save $2,277/mo in MRR",
    confidence: 76,
  },
  {
    type: "pricing" as const,
    icon: Target,
    title: "Pricing Optimization",
    description: "Your Community Access at $99/mo is underpriced by 23% compared to similar creators. Test $129/mo with a grandfather clause for existing members.",
    action: "A/B Test New Price",
    impact: "+$25K/mo MRR uplift",
    confidence: 82,
  },
  {
    type: "engagement" as const,
    icon: Zap,
    title: "Peak Engagement Window",
    description: "Your community is most active Tue–Thu, 2–4 PM EST. Schedule your next product launch during this window for 3.2x higher conversion.",
    action: "Schedule Launch",
    impact: "3.2x conversion boost",
    confidence: 91,
  },
];

const typeStyles = {
  upsell: "border-l-primary",
  churn: "border-l-destructive",
  pricing: "border-l-warning",
  engagement: "border-l-primary",
};

export function AIGrowthEngine() {
  return (
    <div className="space-y-6">
      {/* AI Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--primary)),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Growth Engine</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Automated revenue intelligence · Updated 2 min ago</p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-primary/40 flex items-center justify-center">
                <span className="text-xl font-bold font-mono">87</span>
              </div>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground mt-3">Revenue Health Score: <span className="text-primary font-bold">87/100</span> — performing above average. 4 actions recommended.</p>
      </motion.div>

      {/* Suggestions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Actions</h3>
        {suggestions.map((suggestion, i) => {
          const Icon = suggestion.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card border-l-4 ${typeStyles[suggestion.type]} p-5 hover:border-primary/20 transition-all cursor-pointer group`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">{suggestion.title}</h4>
                    <span className="text-[10px] font-mono bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                      {suggestion.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{suggestion.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1">
                      {suggestion.action} <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium text-primary">{suggestion.impact}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
