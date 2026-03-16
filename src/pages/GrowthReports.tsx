import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, X, Target, TrendingUp, Flame, Calendar, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import SEOHead from "@/components/SEOHead";
import { useAllWeeklyReports, useMarkReportRead } from "@/hooks/useWeeklyReport";

export default function GrowthReports() {
  const navigate = useNavigate();
  const { data: reports, isLoading } = useAllWeeklyReports();
  const markRead = useMarkReportRead();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expandedReport = reports?.find((r: any) => r.id === expandedId);
  const highlightIcons = [TrendingUp, Flame, Target];

  const handleExpand = (report: any) => {
    setExpandedId(report.id);
    if (!report.read) {
      markRead.mutate(report.id);
    }
  };

  return (
    <AppLayout>
      <SEOHead title="Growth Reports" description="Browse your ARIA weekly growth reports history." />
      <div className="max-w-2xl mx-auto pb-24 md:pb-8">
        {/* Header */}
        <div className="px-4 md:px-8 pt-4 md:pt-8 pb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Growth Reports</h1>
              <p className="text-xs text-muted-foreground">Weekly insights from ARIA, your AI growth partner</p>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="px-4 md:px-8 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-muted rounded" />
                    <div className="h-2.5 w-48 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : !reports || reports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-1">No reports yet</h3>
              <p className="text-sm text-muted-foreground">ARIA generates your first report on Monday.</p>
            </motion.div>
          ) : (
            reports.map((report: any, i: number) => {
              const isNew = !report.read;
              return (
                <motion.button
                  key={report.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleExpand(report)}
                  className={`w-full text-left rounded-2xl border transition-all duration-200 group ${
                    isNew
                      ? "border-primary/25 bg-gradient-to-r from-primary/6 via-card to-card hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]"
                      : "border-border bg-card hover:border-primary/15"
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-center gap-4">
                    {/* Date circle */}
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                      isNew ? "bg-primary/12" : "bg-secondary/60"
                    }`}>
                      <span className={`text-[10px] font-bold uppercase leading-none ${isNew ? "text-primary" : "text-muted-foreground"}`}>
                        {new Date(report.week_start).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className={`text-base font-extrabold leading-tight ${isNew ? "text-primary" : "text-foreground"}`}>
                        {new Date(report.week_start).getDate()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-foreground">Week of {new Date(report.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        {isNew && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">NEW</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{report.report_content}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Expanded Report Modal */}
      <AnimatePresence>
        {expandedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setExpandedId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 pb-5 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent">
                <button
                  onClick={() => setExpandedId(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">ARIA Weekly Report</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight mb-1">Your Week in Review</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(expandedReport.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {new Date(expandedReport.week_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                <p className="text-sm text-foreground/90 leading-relaxed">{expandedReport.report_content}</p>

                {(expandedReport.highlights as any[])?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Key Insights</p>
                    {(expandedReport.highlights as any[]).map((h: any, i: number) => {
                      const Icon = highlightIcons[i % highlightIcons.length];
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.08 }}
                          className="flex gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground mb-0.5">{h.label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{h.insight}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {expandedReport.action_item && (
                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden">
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-primary" />
                      <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">This Week's Action</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">{expandedReport.action_item}</p>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground/50 text-center pt-2">Powered by ARIA · Your AI Growth Partner</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}