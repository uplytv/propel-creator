import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Sparkles, Pencil } from "lucide-react";
import {
  deriveTier,
  deriveCommunityType,
  buildFirst30Days,
} from "@/lib/onboardingTier";

interface PlanPreviewProps {
  firstName: string;
  followerCount?: string;
  isMonetizing?: string | null;
  monthlyEarnings?: string;
  creatorStage?: string;
  creatorType?: string;
  firstUseCase?: string;
  goals?: string[];
  goalTimeline?: string;
  onBack: () => void;
  onContinue: () => void;
  /** Jump back to a specific onboarding step (2, 3, or 4). */
  onEditStep: (step: 2 | 3 | 4) => void;
}

/** Inline pencil button used in section headers. */
function EditButton({
  onClick,
  label,
  testId,
}: {
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={label}
      className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors"
    >
      <Pencil className="w-3 h-3" aria-hidden="true" />
      Edit
    </button>
  );
}

export default function PlanPreview(props: PlanPreviewProps) {
  const tier = deriveTier({
    followerCount: props.followerCount,
    isMonetizing: props.isMonetizing,
    monthlyEarnings: props.monthlyEarnings,
    creatorStage: props.creatorStage,
  });
  const community = deriveCommunityType({
    firstUseCase: props.firstUseCase,
    goals: props.goals,
    creatorType: props.creatorType,
  });
  const actions = buildFirst30Days({ tier, community, goalTimeline: props.goalTimeline });

  const grouped: Record<number, typeof actions> = { 1: [], 2: [], 3: [], 4: [] };
  actions.forEach((a) => grouped[a.week].push(a));

  // Each week is shaped by upstream answers — route the user to the step that
  // controls that week's actions. Weeks 1–2 are activation/goal-driven (Step 4);
  // Weeks 3–4 reflect stage + use case (Step 3).
  const weekEditStep: Record<1 | 2 | 3 | 4, 2 | 3 | 4> = {
    1: 4,
    2: 4,
    3: 3,
    4: 3,
  };
  const weekEditLabel: Record<1 | 2 | 3 | 4, string> = {
    1: "Edit goals & timeline",
    2: "Edit goals & timeline",
    3: "Edit your stage & use case",
    4: "Edit your stage & use case",
  };

  return (
    <motion.div
      key="plan-preview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md"
    >
      <p className="text-xs text-muted-foreground text-center mb-1 uppercase tracking-wider">
        Your personalized plan
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
        Here's your first 30 days{props.firstName ? `, ${props.firstName.split(" ")[0]}` : ""} ✨
      </h1>
      <p className="text-muted-foreground text-center text-sm mb-5">
        Built from your answers. Tap <span className="inline-flex items-center gap-0.5 text-primary font-medium"><Pencil className="w-3 h-3" aria-hidden="true" />Edit</span> on any section to tweak it.
      </p>

      {/* Tier + community type */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center mb-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Starting tier</p>
            <EditButton
              onClick={() => props.onEditStep(2)}
              label="Edit tier inputs (followers, monetization, earnings)"
              testId="edit-tier"
            />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">{tier.emoji}</span>
            <span className="text-sm font-bold text-foreground">Tier {tier.level} · {tier.name}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{tier.blurb}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center mb-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Community type</p>
            <EditButton
              onClick={() => props.onEditStep(3)}
              label="Edit community type inputs (use case, goals)"
              testId="edit-community"
            />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">{community.emoji}</span>
            <span className="text-sm font-bold text-foreground">{community.label}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{community.reason}</p>
        </div>
      </div>

      {/* 30-day plan */}
      <div className="rounded-xl border border-border bg-card p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-foreground">First 30 days</h2>
        </div>
        <ol className="space-y-3">
          {([1, 2, 3, 4] as const).map((w) => (
            <li key={w}>
              <div className="flex items-center mb-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Week {w}</p>
                <EditButton
                  onClick={() => props.onEditStep(weekEditStep[w])}
                  label={`${weekEditLabel[w]} (week ${w})`}
                  testId={`edit-week-${w}`}
                />
              </div>
              <ul className="space-y-2">
                {grouped[w].map((a, i) => (
                  <li key={`${w}-${i}`} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={props.onBack} className="gap-1" data-testid="plan-preview-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          variant="hero"
          size="xl"
          className="flex-1"
          onClick={props.onContinue}
          data-testid="plan-preview-continue"
        >
          Looks good — finish <ArrowRight className="ml-1 w-4 h-4" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        You can edit this plan anytime from your dashboard.
      </p>
    </motion.div>
  );
}
