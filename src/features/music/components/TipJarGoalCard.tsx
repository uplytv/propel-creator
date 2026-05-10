import { memo } from "react";
import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import type { TipJarGoal } from "../hooks/useTipJarGoals";

interface Props {
  goal: TipJarGoal;
  to?: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

function TipJarGoalCardImpl({ goal, to }: Props) {
  const pct = Math.min(100, Math.round((goal.raised_cents / goal.target_cents) * 100));
  const inner = (
    <div className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        {goal.image_url ? (
          <img src={goal.image_url} alt={goal.title} loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold truncate">{goal.title}</h3>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                goal.status === "reached"
                  ? "bg-primary text-primary-foreground"
                  : goal.status === "closed"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {goal.status}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmt(goal.raised_cents)} raised</span>
            <span>{pct}% of {fmt(goal.target_cents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export const TipJarGoalCard = memo(TipJarGoalCardImpl);
