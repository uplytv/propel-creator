import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, X, Target, TrendingUp, Zap } from "lucide-react";
import { useLatestWeeklyReport, useMarkReportRead } from "@/hooks/useWeeklyReport";

export function WeeklyGrowthReport() {
  const { data: report, isLoading } = useLatestWeeklyReport();
  const markRead = useMarkReportRead();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !report) return null;

  const highlights = (report.highlights as any[]) || [];
  const isNew = !report.read;

  const handleExpand = () => {
    setExpanded(true);
    if (isNew) {
      markRead.mutate(report.id);
    }
  };

  return (
    <>
      {/* Compact Card */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleExpand}
        className={`w-full text-left glass-card p-4 relative overflow-hidden group transition-all hover:border-primary/30 ${
          isNew ? "border-primary/20 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.2)]" : ""
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isNew ? "bg-primary/15" : "bg-secondary"
          }`}>
            <Sparkles className={`w-5 h-5 ${isNew ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">Weekly Growth Report</p>
              {isNew && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">NEW</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{report.action_item}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </motion.button>

      {/* Expanded Modal */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-primary/5 relative">
                <button onClick={() => setExpanded(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">Weekly Growth Report</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(report.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm text-foreground leading-relaxed">{report.report_content}</p>
                </div>

                {/* Highlights */}
                {highlights.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Insights</p>
                    {highlights.map((h: any, i: number) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                        <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{h.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{h.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Item */}
                {report.action_item && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">This Week's Action</p>
                    </div>
                    <p className="text-sm font-medium text-foreground">{report.action_item}</p>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground text-center">Powered by ARIA · Your AI Growth Partner</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
