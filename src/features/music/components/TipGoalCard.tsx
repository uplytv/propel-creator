import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users, CheckCircle2 } from "lucide-react";
import type { TipGoal } from "../hooks/useTipGoals";

interface Props {
  goal: TipGoal;
  onClick?: () => void;
}

const STATUS: Record<TipGoal["status"], { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  active: { label: "Active", cls: "bg-primary/20 text-primary" },
  reached: { label: "Reached", cls: "bg-primary text-primary-foreground" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
};

export function TipGoalCard({ goal, onClick }: Props) {
  const pct = Math.min(100, Math.round((goal.raised_cents / goal.goal_cents) * 100));
  const status = STATUS[goal.status];
  const reached = goal.status === "reached" || goal.raised_cents >= goal.goal_cents;

  return (
    <Card
      className="bg-card/40 border-border/50 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold truncate">{goal.title}</h3>
          </div>
          <Badge className={status.cls}>{status.label}</Badge>
        </div>

        {goal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              ${(goal.raised_cents / 100).toFixed(0)}
              <span className="text-muted-foreground font-normal">
                {" "}/ ${(goal.goal_cents / 100).toFixed(0)}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {reached && <CheckCircle2 className="w-3 h-3 text-primary" />}
              {pct}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {goal.contributor_count} contributor{goal.contributor_count === 1 ? "" : "s"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
