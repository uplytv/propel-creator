import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, X, Target, TrendingUp, Flame, Calendar, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

  const highlightIcons = [TrendingUp, Flame, Target];

  return (
    <>
      {/* Compact Card — Premium feel */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        onClick={handleExpand}
        className={`w-full text-left relative overflow-hidden rounded-2xl border transition-all duration-300 group ${
          isNew
            ? "border-primary/30 bg-gradient-to-r from-primary/8 via-card to-card shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)]"
            : "border-border bg-card hover:border-primary/20"
        }`}
      >
        {/* Animated gradient shimmer for new reports */}
        {isNew && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
        )}

        <div className="relative z-10 p-4 sm:p-5 flex items-center gap-4">
          {/* Icon with glow */}
          <div className={`relative flex-shrink-0`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
              isNew
                ? "bg-gradient-to-br from-primary/20 to-primary/5"
                : "bg-secondary"
            }`}>
              <Sparkles className={`w-5 h-5 ${isNew ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            {isNew && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-foreground">Weekly Growth Report</p>
              {isNew && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
                  NEW
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{report.action_item}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Calendar className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground/60">
                {new Date(report.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(report.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </motion.button>

      {/* Expanded Modal — Full report */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="relative p-6 pb-5 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent">
                {/* Close button */}
                <button
                  onClick={() => setExpanded(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* ARIA branding */}
                <div className="flex items-center gap-1.5 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">ARIA Weekly Report</span>
                </div>

                {/* Title & date */}
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight mb-1">
                  Your Week in Review
                </h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {new Date(report.week_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-sm text-foreground/90 leading-relaxed">{report.report_content}</p>
                </motion.div>

                {/* Highlights / Key Insights */}
                {highlights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-3"
                  >
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Key Insights</p>
                    <div className="space-y-2.5">
                      {highlights.map((h: any, i: number) => {
                        const Icon = highlightIcons[i % highlightIcons.length];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.08 }}
                            className="flex gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/50 hover:border-primary/15 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground mb-0.5">{h.label}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{h.insight}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Action Item — Hero CTA */}
                {report.action_item && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden"
                  >
                    {/* Subtle glow dot */}
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary/40 animate-pulse" />

                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-primary" />
                      <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">This Week's Action</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">{report.action_item}</p>
                  </motion.div>
                )}

                {/* Footer */}
                <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
                  Powered by ARIA · Your AI Growth Partner
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
