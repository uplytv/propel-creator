import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareGrowthPlanModal from "./ShareGrowthPlanModal";
import GrowthPlanEditor from "./GrowthPlanEditor";
import { useApp } from "@/context/AppContext";
import { buildGrowthPlan } from "@/lib/growthPlan";

export default function GrowthPlanCard() {
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { profile } = useApp();
  const plan = buildGrowthPlan(profile);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        data-tour="growth-plan"
        className="mx-4 md:mx-8 mb-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Growth plan</p>
              <h3 className="text-base font-bold text-foreground">Share your 30-day plan</h3>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Auto-synced to your tier and challenge. Export to calendar or send to your team in one click.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg border border-border bg-background/50 p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{plan.weeklyTasks.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Habits</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{plan.milestones.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Milestones</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{plan.nextActions.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Next steps</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setEditorOpen(true)} className="flex-1 gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit with AI
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)} className="gap-1.5" aria-label="Export & share">
            <Calendar className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>

      <ShareGrowthPlanModal open={open} onOpenChange={setOpen} />
      <GrowthPlanEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </>
  );
}
