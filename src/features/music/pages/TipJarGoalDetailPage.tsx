import { useParams } from "react-router-dom";
import { Target } from "lucide-react";
import { useTipJarGoal, useTipJarContributions } from "../hooks/useTipJarGoals";
import { TipJarContributionForm } from "../components/TipJarContributionForm";

const fmt = (cents: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);

export default function TipJarGoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: goal, isLoading } = useTipJarGoal(id);
  const { data: contributions = [] } = useTipJarContributions(id);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  if (!goal) return <div className="p-4 text-sm text-muted-foreground">Goal not found.</div>;

  const pct = Math.min(100, Math.round((goal.raised_cents / goal.target_cents) * 100));
  const ended = goal.status !== "active";

  return (
    <div className="mobile-safe-content p-4 space-y-4 max-w-xl mx-auto">
      {goal.image_url ? (
        <img src={goal.image_url} alt={goal.title} className="w-full aspect-video object-cover rounded-2xl" />
      ) : (
        <div className="w-full aspect-video rounded-2xl bg-primary/10 flex items-center justify-center">
          <Target className="h-12 w-12 text-primary" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{goal.title}</h1>
        {goal.description && (
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{goal.description}</p>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{fmt(goal.raised_cents)} raised</span>
          <span className="text-muted-foreground">{pct}% of {fmt(goal.target_cents)}</span>
        </div>
      </div>

      <TipJarContributionForm goalId={goal.id} disabled={ended} />

      <div>
        <h2 className="font-semibold mb-2">Recent supporters</h2>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Be the first to contribute.</p>
        ) : (
          <div className="space-y-2">
            {contributions.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card/40 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {c.is_anonymous ? "Anonymous" : c.fan_id.slice(0, 8)}
                  </span>
                  <span className="text-primary font-semibold">{fmt(c.amount_cents)}</span>
                </div>
                {c.message && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                    {c.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
