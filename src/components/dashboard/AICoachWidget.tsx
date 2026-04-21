import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useGrowthPlan } from "@/hooks/useGrowthPlan";
import { toast } from "sonner";

interface CoachAction {
  title: string;
  why: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

export default function AICoachWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [headline, setHeadline] = useState<string>("");
  const [actions, setActions] = useState<CoachAction[]>([]);
  const { profile } = useApp();
  const { plan } = useGrowthPlan();

  const fetchActions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-coach-suggest", {
        body: {
          context: {
            creatorName: profile.name,
            tier: profile.tier,
            members: profile.members,
            mrr: profile.mrr,
            challenge: profile.challenge,
            planTitle: plan?.title,
            targetKpis: plan?.targetKpis,
            weeklyTasks: (plan?.weeklyTasks ?? []).map((t) => t.title),
            milestones: (plan?.milestones ?? []).map((m) => m.title),
            completed: (plan?.weeklyTasks ?? []).filter((t) => t.done).map((t) => t.title),
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setHeadline(data?.headline ?? "");
      setActions(data?.actions ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch coach suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    if (actions.length === 0 && !loading) await fetchActions();
  };

  const impactColor = (v: string) =>
    v === "high" ? "bg-primary/20 text-primary border-primary/30"
      : v === "medium" ? "bg-accent/20 text-accent-foreground border-accent/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        onClick={handleOpen}
        aria-label="Open AI Coach"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Sparkles className="w-6 h-6 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-primary/30 bg-card p-5 pb-28"
            >
              <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider">AI Coach</p>
                    <h3 className="text-lg font-bold text-foreground">This week's playbook</h3>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing your plan & metrics...</p>
                </div>
              ) : actions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">Tap below to generate this week's actions.</p>
                  <Button onClick={fetchActions} className="gap-2"><Sparkles className="w-4 h-4" /> Generate</Button>
                </div>
              ) : (
                <>
                  {headline && (
                    <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-3">
                      <p className="text-sm font-medium text-foreground leading-snug">{headline}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {actions.map((a, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="rounded-xl border border-border bg-background/50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm leading-snug mb-1.5">{a.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{a.why}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${impactColor(a.impact)}`}>
                                <Zap className="w-2.5 h-2.5 mr-1" /> {a.impact} impact
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {a.effort} effort
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Button
                    onClick={fetchActions}
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 gap-2"
                    disabled={loading}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
