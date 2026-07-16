import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlatformPlan } from "./plans";

interface PlanCardProps {
  plan: PlatformPlan;
  onStartTrial: (plan: PlatformPlan) => void;
  /** Optional override for the CTA state (e.g. current plan). */
  isCurrent?: boolean;
  /** Trial length shown in the footer (founding offer passes 30). Display only. */
  trialDays?: number;
}

/**
 * Shared platform-plan card used by /pricing and the homepage pricing section.
 * Square corners everywhere per UPLY design tokens.
 */
export default function PlanCard({ plan, onStartTrial, isCurrent = false, trialDays = 14 }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-md border bg-card p-6 sm:p-7 flex flex-col ${
        plan.popular ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-sm bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
          Most Popular
        </div>
      )}

      {/* Plan name chip */}
      <div className="mb-4">
        <span className="inline-block rounded-sm border border-border bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-foreground">
          {plan.name}
        </span>
      </div>

      <div className="mb-1">
        <span className="text-4xl font-bold text-foreground">${plan.price}</span>
        <span className="ml-1 text-sm text-muted-foreground">/Month</span>
      </div>

      <p className="mb-5 text-sm text-muted-foreground">{plan.audience}</p>

      {/* Feature list with dividers */}
      <ul className="mb-6 flex-1 divide-y divide-border border-y border-border">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 py-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onStartTrial(plan)}
        disabled={isCurrent}
        variant={plan.popular ? "default" : "outline"}
        className="w-full rounded-sm font-bold"
      >
        {isCurrent ? "Current plan" : "Start free trial"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {trialDays} days free · cancel anytime
      </p>
    </div>
  );
}
